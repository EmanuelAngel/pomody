import { NoopUpdateChecker } from '../adapters/update/noop-update-checker';
import { TauriUpdateChecker } from '../adapters/update/tauri-update-checker';
import { isTauriRuntimeAvailable } from '../adapters/window/tauri-window-shell';
import type { IUpdateChecker, UpdateInfo } from '../domain/ports/update-checker.port';
import type { TimerState as TimerFsmState } from '../domain/timer/timer-fsm';
import { UPDATE_CHECK_INTERVAL_MS, isUpdateInstallBlocked } from '../domain/updates/update-policy';
import { timerState } from './timer.svelte';

/** What the request in flight is doing. `idle` means no request. */
export type UpdateStatus = 'idle' | 'checking' | 'installing';

/** The slice of the timer this state needs: whether a block is in progress. */
export interface UpdateTimerSource {
	readonly state: TimerFsmState;
}

export interface UpdateStateOptions {
	/** The timer whose blocks an install must never interrupt. Required: nothing else knows. */
	readonly timer: UpdateTimerSource;
	readonly checker?: IUpdateChecker;
}

/**
 * Reactive state of the application updater (Svelte 5 Runes): what the last check found,
 * whether it can be installed right now, and the loop that keeps asking while the app
 * stays open.
 *
 * It owns no native logic: every request goes through the injected `IUpdateChecker`. The
 * rule it enforces is one line: an update is never installed while a block is in progress
 * (spec S3), because installing quits the application on Windows. Checking is always
 * allowed — only installing is gated — and the user, not the loop, starts the install.
 *
 * A failed check or install never throws: it is recorded in a flag the Settings panel can
 * show, and an update found earlier survives a later failed check.
 */
export class UpdateState {
	private readonly checker: IUpdateChecker;
	private readonly timer: UpdateTimerSource;

	private _info = $state<UpdateInfo | null>(null);
	private _status = $state<UpdateStatus>('idle');
	private _checkedOnce = $state(false);
	private _lastCheckFailed = $state(false);
	private _installFailed = $state(false);

	private loop: ReturnType<typeof setInterval> | null = null;

	constructor(options: UpdateStateOptions) {
		this.checker = options.checker ?? createDefaultUpdateChecker();
		this.timer = options.timer;
	}

	/** False on the web build, where there is nothing to update and no UI to show. */
	public get isSupported(): boolean {
		return this.checker.isSupported;
	}

	public get info(): UpdateInfo | null {
		return this._info;
	}

	public get hasUpdate(): boolean {
		return this._info !== null;
	}

	public get status(): UpdateStatus {
		return this._status;
	}

	/** True only after a check succeeded and found nothing newer. */
	public get upToDate(): boolean {
		return this._checkedOnce && !this._lastCheckFailed && this._info === null;
	}

	public get lastCheckFailed(): boolean {
		return this._lastCheckFailed;
	}

	public get installFailed(): boolean {
		return this._installFailed;
	}

	/** True while a block is in progress, so the UI can say why the install is waiting. */
	public get installBlockedByTimer(): boolean {
		return isUpdateInstallBlocked(this.timer.state);
	}

	public get canInstall(): boolean {
		return this.hasUpdate && this._status === 'idle' && !this.installBlockedByTimer;
	}

	/**
	 * Checks now and keeps checking every {@link UPDATE_CHECK_INTERVAL_MS} (spec S4).
	 * Idempotent, and a no-op on a platform that cannot update.
	 */
	public start(): void {
		if (!this.isSupported || this.loop !== null) {
			return;
		}

		void this.checkNow();
		this.loop = setInterval(() => void this.checkNow(), UPDATE_CHECK_INTERVAL_MS);
	}

	public stop(): void {
		if (this.loop === null) {
			return;
		}

		clearInterval(this.loop);
		this.loop = null;
	}

	/** Asks for a newer version. Never throws; ignored while another request is in flight. */
	public async checkNow(): Promise<void> {
		if (!this.isSupported || this._status !== 'idle') {
			return;
		}

		this._status = 'checking';

		try {
			this._info = await this.checker.check();
			this._lastCheckFailed = false;
		} catch {
			this._lastCheckFailed = true;
		} finally {
			this._checkedOnce = true;
			this._status = 'idle';
		}
	}

	/**
	 * Installs the update found. Refused while a block is in progress or while another
	 * request is in flight. On Windows a successful install quits the application, so
	 * reaching the line after it means the install did not happen.
	 */
	public async install(): Promise<void> {
		if (!this.canInstall) {
			return;
		}

		this._status = 'installing';
		this._installFailed = false;

		try {
			await this.checker.installPending();
		} catch {
			this._installFailed = true;
		} finally {
			this._status = 'idle';
		}
	}
}

/** Selects the update channel matching the current runtime. */
export function createDefaultUpdateChecker(): IUpdateChecker {
	return isTauriRuntimeAvailable() ? new TauriUpdateChecker() : new NoopUpdateChecker();
}

/** Factory for isolated instances (tests, sub-contexts). */
export function createUpdateState(options: UpdateStateOptions): UpdateState {
	return new UpdateState(options);
}

/**
 * Global singleton consumed by the header indicator and the Settings panel. It is wired to
 * `timerState` here and nowhere else: the app already has one timer.
 */
export const updateState = createUpdateState({ timer: timerState });
