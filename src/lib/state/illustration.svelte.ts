import { LocalSettingsStorage } from '../adapters/storage/local-settings-storage';
import {
	DEFAULT_ILLUSTRATION,
	DEFAULT_ILLUSTRATION_ID,
	findIllustration,
	type IllustrationDefinition,
	type IllustrationId
} from '../domain/illustration/illustration-catalog';
import { calculatePhase, calculateStep } from '../domain/illustration/illustration-progress';
import {
	DEFAULT_ILLUSTRATION_SETTINGS,
	type IllustrationSettings,
	type ISettingsStorage
} from '../domain/ports/settings-storage.port';
import type { TimerMode } from '../domain/timer/timer-fsm';
import { dailyStatsState } from './daily-stats.svelte';
import { timerState } from './timer.svelte';

/** Minimal read-only contract the illustration needs from daily stats. */
export interface IllustrationProgressSource {
	readonly accumulatedMinutes: number;
}

/** Minimal read-only contract the illustration needs from the timer. */
export interface IllustrationTimerSource {
	readonly isRunning: boolean;
	readonly mode: TimerMode;
}

/**
 * Reactive state of the living companion illustration.
 *
 * Progression is derived from the existing daily focus minutes: never persisted
 * separately and never advanced from within a block. Visibility and motion are
 * pure derivations of the persisted preferences and the timer state.
 */
export class IllustrationState {
	private readonly storage?: ISettingsStorage;
	/**
	 * Inline defaults keep field initializers valid; the constructor replaces
	 * them before the lazy derivations are ever read.
	 */
	private dailyStats: IllustrationProgressSource = { accumulatedMinutes: 0 };
	private timer: IllustrationTimerSource = { isRunning: false, mode: 'focus' };

	private _enabled = $state<boolean>(DEFAULT_ILLUSTRATION_SETTINGS.enabled);
	private _motionEnabled = $state<boolean>(DEFAULT_ILLUSTRATION_SETTINGS.motionEnabled);
	private _hideWhileFocusing = $state<boolean>(DEFAULT_ILLUSTRATION_SETTINGS.hideWhileFocusing);
	private _selectedId = $state<IllustrationId>(DEFAULT_ILLUSTRATION_ID);

	public readonly isFocusRunning = $derived(this.timer.isRunning && this.timer.mode === 'focus');

	public readonly step = $derived(calculateStep(this.dailyStats.accumulatedMinutes));

	public readonly definition = $derived<IllustrationDefinition>(
		findIllustration(this._selectedId) ?? DEFAULT_ILLUSTRATION
	);

	public readonly phase = $derived(calculatePhase(this.step, this.definition.phaseCount));

	public readonly isVisible = $derived(
		this._enabled && !(this._hideWhileFocusing && this.isFocusRunning)
	);

	/**
	 * Ambient motion is CSS-only. `prefers-reduced-motion` is enforced by the
	 * component's media query, so it is intentionally not part of this derivation.
	 */
	public readonly shouldAnimate = $derived(
		this.isVisible && this._motionEnabled && this.isFocusRunning
	);

	constructor(
		storage?: ISettingsStorage,
		dailyStats: IllustrationProgressSource = dailyStatsState,
		timer: IllustrationTimerSource = timerState
	) {
		this.storage = storage;
		this.dailyStats = dailyStats;
		this.timer = timer;

		const persisted = storage?.loadSettings().illustration ?? DEFAULT_ILLUSTRATION_SETTINGS;
		this._enabled = persisted.enabled;
		this._motionEnabled = persisted.motionEnabled;
		this._hideWhileFocusing = persisted.hideWhileFocusing;
		this._selectedId = persisted.selectedId;
	}

	public get enabled(): boolean {
		return this._enabled;
	}

	public get motionEnabled(): boolean {
		return this._motionEnabled;
	}

	public get hideWhileFocusing(): boolean {
		return this._hideWhileFocusing;
	}

	public get selectedId(): IllustrationId {
		return this._selectedId;
	}

	public setEnabled(enabled: boolean): void {
		this._enabled = enabled;
		this.persist();
	}

	public toggleEnabled(): void {
		this._enabled = !this._enabled;
		this.persist();
	}

	public setMotionEnabled(enabled: boolean): void {
		this._motionEnabled = enabled;
		this.persist();
	}

	public toggleMotion(): void {
		this._motionEnabled = !this._motionEnabled;
		this.persist();
	}

	public setHideWhileFocusing(enabled: boolean): void {
		this._hideWhileFocusing = enabled;
		this.persist();
	}

	public toggleHideWhileFocusing(): void {
		this._hideWhileFocusing = !this._hideWhileFocusing;
		this.persist();
	}

	public setSelectedId(id: string): void {
		if (findIllustration(id) === undefined) {
			return;
		}

		this._selectedId = id as IllustrationId;
		this.persist();
	}

	private persist(): void {
		const illustration: IllustrationSettings = {
			enabled: this._enabled,
			motionEnabled: this._motionEnabled,
			hideWhileFocusing: this._hideWhileFocusing,
			selectedId: this._selectedId
		};

		this.storage?.saveSettings({ illustration });
	}
}

/**
 * Factory function to create isolated IllustrationState instances.
 */
export function createIllustrationState(
	storage?: ISettingsStorage,
	dailyStats?: IllustrationProgressSource,
	timer?: IllustrationTimerSource
): IllustrationState {
	return new IllustrationState(storage, dailyStats, timer);
}

/**
 * Global singleton reactive illustration state for the application.
 */
export const illustrationState = new IllustrationState(new LocalSettingsStorage());

export default illustrationState;
