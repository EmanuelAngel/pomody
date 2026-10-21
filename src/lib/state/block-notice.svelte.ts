import { NoopBlockNotifier } from '../adapters/notification/noop-block-notifier';
import { TauriBlockNotifier } from '../adapters/notification/tauri-block-notifier';
import { LocalSettingsStorage } from '../adapters/storage/local-settings-storage';
import { isTauriRuntimeAvailable } from '../adapters/window/tauri-window-shell';
import type { BlockNotice, IBlockNotifier } from '../domain/ports/block-notifier.port';
import type { ISettingsStorage } from '../domain/ports/settings-storage.port';
import {
	calculateNextCycleStep,
	type DomainEvent,
	type TimerConfig,
	type TimerMode,
	type Unsubscribe
} from '../domain/timer/timer-fsm';
import { t } from '$lib/state/locale.svelte';
import { windowState } from './windowState.svelte';
import { timerState } from './timer.svelte';

/**
 * The slice of the timer this state needs: when a block completed, and how long the cycle
 * is. Both `TimerFSM` and `TimerState` satisfy it, so tests drive a real FSM.
 */
export interface BlockNoticeTimerSource {
	readonly config: Pick<TimerConfig, 'roundsBeforeLongBreak'>;
	onEvent(subscriber: (event: DomainEvent) => void): Unsubscribe;
}

export interface BlockNoticeStateOptions {
	/** The timer whose completions are announced. Required: nothing else knows the cycle. */
	readonly timer: BlockNoticeTimerSource;
	readonly settingsStorage?: ISettingsStorage;
	readonly notifier?: IBlockNotifier;
	/** True while the window is hidden or unfocused. Injected so Node tests never touch the DOM. */
	readonly isWindowUnattended?: () => boolean;
	/** True while the window stays on top (Mini-Player), where the phase change is already visible. */
	readonly isAlwaysOnTop?: () => boolean;
}

/** DOM-only predicate of "the user is not looking at Pomody" (spec S2). */
function isWindowUnattended(): boolean {
	if (typeof document === 'undefined') {
		return false;
	}

	return document.visibilityState === 'hidden' || !document.hasFocus();
}

/**
 * Reactive state of the block-end notifier (Svelte 5 Runes): the switch, the permission
 * outcome, and the announcement of a finished block.
 *
 * It owns no native logic and no persistence format: every read and write goes through the
 * injected ports, exactly like `DistractionState`. The rule it enforces is one line: a
 * natural completion notifies only while the user cannot see the window, and never while
 * an always-on-top window is already showing the phase change.
 *
 * The in-app toast of PR 2 joins this same state, so both channels share the switch and the
 * predicate instead of duplicating them.
 */
export class BlockNoticeState {
	private readonly settingsStorage: ISettingsStorage;
	private readonly notifier: IBlockNotifier;
	private readonly timer: BlockNoticeTimerSource;
	private readonly isWindowUnattended: () => boolean;
	private readonly isAlwaysOnTop: () => boolean;
	private readonly unsubscribe: Unsubscribe;

	private _enabled = $state<boolean>(false);
	private _permissionDenied = $state<boolean>(false);

	constructor(options: BlockNoticeStateOptions) {
		this.settingsStorage = options.settingsStorage ?? new LocalSettingsStorage();
		this.notifier = options.notifier ?? createDefaultBlockNotifier();
		this.timer = options.timer;
		this.isWindowUnattended = options.isWindowUnattended ?? isWindowUnattended;
		this.isAlwaysOnTop = options.isAlwaysOnTop ?? (() => windowState.isAlwaysOnTop);

		// Seed the persisted switch eagerly, like `distractionState`: the Behavior panel
		// renders it on first paint, so a persisted OFF must be visible before any mount.
		this._enabled = this.settingsStorage.loadSettings().blockNotificationsEnabled;

		this.unsubscribe = this.timer.onEvent((event) => this.handleEvent(event));
	}

	public get enabled(): boolean {
		return this._enabled;
	}

	/** True only after the user asked for notifications and the OS refused. */
	public get permissionDenied(): boolean {
		return this._permissionDenied;
	}

	/** Unsubscribes from the timer. The app has no use for it; tests keep them isolated. */
	public dispose(): void {
		this.unsubscribe();
	}

	/**
	 * Persists the switch and, when turning it on, asks the OS for the permission.
	 *
	 * The switch moves immediately and snaps back if the OS refuses: a denial is not a soft
	 * failure (spec S5). Waiting for the answer first would leave the thumb still while the
	 * user already clicked, and a switch that stays on over a denied permission tells the
	 * user they will be notified when they will not.
	 */
	public setEnabled(enabled: boolean): void {
		if (!enabled) {
			this._enabled = false;
			this._permissionDenied = false;
			this.settingsStorage.saveSettings({ blockNotificationsEnabled: false });
			return;
		}

		this._enabled = true;
		this._permissionDenied = false;
		this.settingsStorage.saveSettings({ blockNotificationsEnabled: true });

		if (!this.notifier.isSupported) {
			// The web has no OS channel to ask for: the in-app toast is the whole story.
			return;
		}

		void this.confirmPermission();
	}

	/**
	 * Asks the OS once per user opt-in and reverts the switch when it refuses.
	 *
	 * `_enabled` is re-read after the await because the user may have turned the switch off
	 * while the dialog was open; a late denial must not resurrect the denial flag.
	 */
	private async confirmPermission(): Promise<void> {
		let granted: boolean;
		try {
			granted = await this.notifier.requestPermission();
		} catch {
			granted = false;
		}

		if (granted || !this._enabled) {
			return;
		}

		this._enabled = false;
		this._permissionDenied = true;
		this.settingsStorage.saveSettings({ blockNotificationsEnabled: false });
	}

	/**
	 * Announces a completed block through the OS channel (spec S1, S2, S6).
	 *
	 * `skip` emits `block-skipped` instead, so a skipped block never announces: the user
	 * is already there, choosing the next phase.
	 */
	private handleEvent(event: DomainEvent): void {
		if (event.type !== 'block-completed' || !this._enabled) {
			return;
		}

		if (this.isAlwaysOnTop() || !this.isWindowUnattended()) {
			return;
		}

		const step = calculateNextCycleStep(
			event.mode,
			event.round,
			this.timer.config.roundsBeforeLongBreak
		);
		const notice = buildNotice(event.mode, step.nextMode);

		try {
			void Promise.resolve(this.notifier.notify(notice)).catch(() => {
				// A lost notice must never break the end of a block (spec S3).
			});
		} catch {
			// A backend that throws synchronously is just as lost, and even less loud.
		}
	}
}

/** Title names what ended; body names what the timer will start next (spec S6). */
function buildNotice(completed: TimerMode, next: TimerMode): BlockNotice {
	return {
		title: titleFor(completed),
		body: bodyFor(next)
	};
}

function titleFor(mode: TimerMode): string {
	switch (mode) {
		case 'focus':
			return t.block_notice_title_focus();
		case 'shortBreak':
			return t.block_notice_title_short_break();
		case 'longBreak':
			return t.block_notice_title_long_break();
	}
}

function bodyFor(mode: TimerMode): string {
	switch (mode) {
		case 'focus':
			return t.block_notice_body_focus();
		case 'shortBreak':
			return t.block_notice_body_short_break();
		case 'longBreak':
			return t.block_notice_body_long_break();
	}
}

/**
 * Selects the notice channel matching the current runtime, mirroring
 * `createDefaultDistractionNotifier`.
 */
export function createDefaultBlockNotifier(): IBlockNotifier {
	return isTauriRuntimeAvailable() ? new TauriBlockNotifier() : new NoopBlockNotifier();
}

/** Factory for isolated instances (tests, sub-contexts). */
export function createBlockNoticeState(options: BlockNoticeStateOptions): BlockNoticeState {
	return new BlockNoticeState(options);
}

/**
 * Global singleton consumed by the Behavior panel and, from PR 2, by the toast host.
 * It is wired to `timerState` here and nowhere else: the app already has one timer.
 */
export const blockNoticeState = createBlockNoticeState({ timer: timerState });
