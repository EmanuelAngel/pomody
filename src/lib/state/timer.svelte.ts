import {
	DEFAULT_TIMER_CONFIG,
	TimerFSM,
	type DomainEvent,
	type TimerConfig,
	type TimerExecutionAdoption,
	type TimerMode,
	type TimerSnapshot,
	type TimerState as TimerFsmState,
	type Unsubscribe
} from '../domain/timer/timer-fsm';
import {
	buildTimerSnapshotRecord,
	type TimerRestoreDecision
} from '../domain/timer/timer-snapshot.entity';
import type { ITimerStateRepository } from '../domain/ports/timer-state-repository.port';
import { WebWorkerTimerTicker } from '../adapters/worker/timer-worker';
import type { ITimerTicker } from '../domain/ports/timer-ticker.port';
import type { IAudioNotifier } from '../domain/ports/IAudioNotifier';
import { WebAudioNotifier } from '../adapters/audio/web-audio-notifier';
import {
	DEFAULT_USER_SETTINGS,
	type ISettingsStorage
} from '../domain/ports/settings-storage.port';
import { LocalSettingsStorage } from '../adapters/storage/local-settings-storage';
import { LocalTimerStateRepository } from '../adapters/storage/local-timer-state-repository';
import { SvelteSet } from 'svelte/reactivity';

/** Plan block the FSM belongs to. A completed FSM still belongs to the block it finished. */
export interface TimerPlanBinding {
	readonly planId: string;
	readonly activeBlockIndex: number;
	readonly completedBlockIndex: number | null;
}

/**
 * Formats a duration in milliseconds to MM:SS string representation.
 * Uses Math.ceil to prevent showing an off-by-one second at the start of a cycle.
 */
export function formatTime(remainingMs: number): string {
	const safeMs = Math.max(0, remainingMs);
	const totalSeconds = Math.ceil(safeMs / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Reactive Composition Root connecting the pure domain TimerFSM with the WebWorker ticker.
 * Exposes fine-grained reactive state via Svelte 5 Runes ($state, $derived).
 */
export class TimerState {
	private readonly fsm: TimerFSM;
	private readonly ticker: ITimerTicker;
	private readonly audioNotifier: IAudioNotifier;
	private readonly storage?: ISettingsStorage;
	private readonly timerRepository?: ITimerStateRepository;
	private readonly now: () => number;
	private readonly unsubscribe: Unsubscribe;
	private readonly unsubscribeEvents: Unsubscribe;
	private _planBinding: TimerPlanBinding | null = null;

	private _soundEnabled = $state<boolean>(true);
	private _revitalizationEnabled = $state<boolean>(true);
	private _configSubscribers = new SvelteSet<(config: TimerConfig) => void>();

	private _snapshot = $state<TimerSnapshot>({
		state: 'idle',
		mode: 'focus',
		remainingMs: 1500000,
		durationMs: 1500000,
		currentRound: 1,
		totalRoundsCompleted: 0,
		progress: 0
	});

	private _config = $state<TimerConfig>(DEFAULT_TIMER_CONFIG);

	public readonly formattedRemainingTime = $derived.by(() =>
		formatTime(this._snapshot.remainingMs)
	);
	public readonly formattedTime = $derived.by(() => this.formattedRemainingTime);

	public get soundEnabled(): boolean {
		return this._soundEnabled;
	}

	public setSoundEnabled(enabled: boolean): void {
		this._soundEnabled = enabled;
		this.storage?.saveSettings({ soundEnabled: this._soundEnabled });
	}

	public toggleSound(): void {
		this._soundEnabled = !this._soundEnabled;
		this.storage?.saveSettings({ soundEnabled: this._soundEnabled });
	}

	public get revitalizationEnabled(): boolean {
		return this._revitalizationEnabled;
	}

	public setRevitalizationEnabled(enabled: boolean): void {
		this._revitalizationEnabled = enabled;
		this.storage?.saveSettings({ revitalizationEnabled: this._revitalizationEnabled });
	}

	public toggleRevitalization(): void {
		this._revitalizationEnabled = !this._revitalizationEnabled;
		this.storage?.saveSettings({ revitalizationEnabled: this._revitalizationEnabled });
	}

	public get snapshot(): TimerSnapshot {
		return this._snapshot;
	}

	public get state(): TimerFsmState {
		return this._snapshot.state;
	}

	public get mode(): TimerMode {
		return this._snapshot.mode;
	}

	public get remainingMs(): number {
		return this._snapshot.remainingMs;
	}

	public get durationMs(): number {
		return this._snapshot.durationMs;
	}

	public get currentRound(): number {
		return this._snapshot.currentRound;
	}

	public get totalRoundsCompleted(): number {
		return this._snapshot.totalRoundsCompleted;
	}

	public get progress(): number {
		return this._snapshot.progress;
	}

	public get isRunning(): boolean {
		return this._snapshot.state === 'running';
	}

	public get config(): TimerConfig {
		return this._config;
	}

	public get roundsBeforeLongBreak(): number {
		return this._config.roundsBeforeLongBreak;
	}

	constructor(
		config?: Partial<TimerConfig>,
		ticker?: ITimerTicker,
		audioNotifier?: IAudioNotifier,
		storage?: ISettingsStorage,
		timerRepository?: ITimerStateRepository,
		now?: () => number
	) {
		this.storage = storage;
		this.timerRepository = timerRepository;
		this.now = now ?? (() => Date.now());
		const storedSettings = this.storage?.loadSettings();
		const initialConfig = storedSettings ? { ...storedSettings.timer, ...config } : config;

		if (storedSettings !== undefined) {
			this._soundEnabled = storedSettings.soundEnabled;
		}
		this._revitalizationEnabled = storedSettings?.revitalizationEnabled ?? true;

		this.fsm = new TimerFSM(initialConfig);
		this.ticker = ticker ?? new WebWorkerTimerTicker();
		this.audioNotifier = audioNotifier ?? new WebAudioNotifier();
		this._snapshot = this.fsm.snapshot;
		this._config = this.fsm.config;

		this.unsubscribe = this.fsm.subscribe((newSnapshot) => {
			const previousState = this._snapshot.state;
			this._snapshot = newSnapshot;
			this._config = this.fsm.config;
			if (newSnapshot.state !== 'running') {
				this.ticker.stop();
			}
			if (
				newSnapshot.state === 'completed' &&
				previousState !== 'completed' &&
				this._planBinding === null
			) {
				// Bound completions are persisted by PlanningState after the plan settles.
				this.persistNow();
			}
		});

		this.unsubscribeEvents = this.fsm.onEvent((event) => {
			if (event.type === 'block-completed' && this._soundEnabled) {
				void this.audioNotifier.notifyBlockCompleted(event.mode);
			}
		});
	}

	/**
	 * Starts or advances the timer.
	 */
	public start(): void {
		void this.audioNotifier.unlock();
		this.fsm.start();
		this.ensureTicker();
		this.persistNow();
	}

	/**
	 * Pauses a running timer and halts ticker.
	 */
	public pause(): void {
		this.fsm.pause();
		this.ticker.stop();
		this.persistNow();
	}

	/**
	 * Resumes a paused timer and restarts ticker.
	 */
	public resume(): void {
		void this.audioNotifier.unlock();
		this.fsm.resume();
		this.ensureTicker();
		this.persistNow();
	}

	/**
	 * Skips the current cycle block and advances to the next mode in idle state.
	 */
	public skip(): void {
		this.ticker.stop();
		this.fsm.skip();
		this.persistNow();
	}

	/**
	 * Updates the timer configuration and recalculates reactive snapshot.
	 */
	public updateConfig(config: Partial<TimerConfig>): void {
		this.fsm.updateConfig(config);
		this.storage?.saveSettings({ timer: this.fsm.config });
		this._config = this.fsm.config;
		for (const subscriber of this._configSubscribers) {
			subscriber(this._config);
		}
		this.persistNow();
	}

	/**
	 * Resets remaining time for the current mode back to initial duration and enters idle state.
	 */
	public reset(): void {
		this.ticker.stop();
		this.fsm.reset();
		this.persistNow();
	}

	/**
	 * Completely resets the timer to its initial state (idle, focus mode, round 1) and stops ticker.
	 */
	public resetToInitial(): void {
		this.reset();
		this.fsm.resetToInitial();
		this.persistNow();
	}

	/**
	 * Resets all user settings back to defaults and persists them to storage.
	 */
	public resetSettings(): void {
		this._revitalizationEnabled = DEFAULT_USER_SETTINGS.revitalizationEnabled;
		this._soundEnabled = DEFAULT_USER_SETTINGS.soundEnabled;
		this.fsm.updateConfig(DEFAULT_TIMER_CONFIG);
		this.storage?.saveSettings({
			timer: this.fsm.config,
			soundEnabled: this._soundEnabled,
			revitalizationEnabled: this._revitalizationEnabled
		});
		this._config = this.fsm.config;
		for (const subscriber of this._configSubscribers) {
			subscriber(this._config);
		}
		this.persistNow();
	}

	/**
	 * Binds the timer to the plan block it belongs to, or unbinds it for a free-running block.
	 */
	public setPlanBinding(binding: TimerPlanBinding | null): void {
		this._planBinding = binding;
	}

	/**
	 * Writes the current execution snapshot to the timer repository.
	 * Called on transitions only; ticks never persist.
	 */
	public persistNow(): void {
		if (!this.timerRepository) {
			return;
		}

		const snapshot = this.fsm.snapshot;
		const binding = this._planBinding;
		const blockIndex = binding
			? snapshot.state === 'completed'
				? (binding.completedBlockIndex ?? binding.activeBlockIndex)
				: binding.activeBlockIndex
			: null;

		const record = buildTimerSnapshotRecord({
			state: snapshot.state,
			mode: snapshot.mode,
			durationMs: snapshot.durationMs,
			remainingMs: snapshot.remainingMs,
			currentRound: snapshot.currentRound,
			totalRoundsCompleted: snapshot.totalRoundsCompleted,
			planId: binding?.planId ?? null,
			blockIndex,
			now: this.now()
		});

		void this.timerRepository.save(record);
	}

	/**
	 * Removes the persisted snapshot (session ended or restore discarded).
	 */
	public async clearPersistedState(): Promise<void> {
		await this.timerRepository?.clear();
	}

	/**
	 * Applies a restore decision produced by `resolveTimerRestore`.
	 *
	 * `config` is the plan's frozen session config. It is adopted into the FSM without
	 * writing user settings, so a reload never reverts preferences changed mid-session.
	 */
	public applyRestoreDecision(decision: TimerRestoreDecision, config?: Partial<TimerConfig>): void {
		if (decision.kind === 'adopt') {
			this.applyAdoption(
				{
					state: decision.state,
					mode: decision.mode,
					durationMs: decision.durationMs,
					remainingMs: decision.remainingMs,
					currentRound: decision.currentRound,
					totalRoundsCompleted: decision.totalRoundsCompleted
				},
				config
			);
			return;
		}

		if (decision.kind === 'anchor') {
			this.applyAdoption(
				{
					state: 'idle',
					mode: decision.mode,
					durationMs: decision.durationMs,
					remainingMs: decision.durationMs,
					currentRound: decision.currentRound,
					totalRoundsCompleted: decision.totalRoundsCompleted
				},
				config
			);
			return;
		}

		const focusDurationMs =
			(config?.focusDurationSeconds ?? this.fsm.config.focusDurationSeconds) * 1000;
		this.applyAdoption(
			{
				state: 'idle',
				mode: 'focus',
				durationMs: focusDurationMs,
				remainingMs: focusDurationMs,
				currentRound: 1,
				totalRoundsCompleted: 0
			},
			config
		);
	}

	private applyAdoption(adoption: TimerExecutionAdoption, config?: Partial<TimerConfig>): void {
		try {
			this.fsm.adopt(adoption, config);
		} catch (error) {
			console.error('Failed to adopt the persisted timer state; falling back to idle.', error);
			this.fsm.adopt({
				state: 'idle',
				mode: 'focus',
				durationMs: adoption.durationMs,
				remainingMs: adoption.durationMs,
				currentRound: 1,
				totalRoundsCompleted: 0
			});
		}

		this._snapshot = this.fsm.snapshot;
		this._config = this.fsm.config;
		for (const subscriber of this._configSubscribers) {
			subscriber(this._config);
		}
		this.ensureTicker();
	}

	private ensureTicker(): void {
		if (this.fsm.state === 'running' && !this.ticker.isRunning) {
			this.ticker.start((deltaMs) => {
				this.fsm.tick(deltaMs);
			});
		}
	}

	/**
	 * Subscribes to domain lifecycle events emitted by the underlying TimerFSM.
	 */
	public onEvent(subscriber: (event: DomainEvent) => void): Unsubscribe {
		return this.fsm.onEvent(subscriber);
	}

	/**
	 * Subscribes to state transitions of the timer.
	 *
	 * Added for the distraction detector, which arms its poll only while a focus block is
	 * `running` and must disarm the instant the block ends, pauses or restarts (spec §4).
	 * Like `onEvent`, the current snapshot is not emitted on subscription, so a subscriber
	 * that needs the initial state reads `snapshot` once after subscribing.
	 */
	public subscribe(subscriber: (snapshot: TimerSnapshot) => void): Unsubscribe {
		return this.fsm.subscribe(subscriber);
	}

	/**
	 * Subscribes to timer configuration changes.
	 */
	public onConfigChange(subscriber: (config: TimerConfig) => void): () => void {
		this._configSubscribers.add(subscriber);
		return () => {
			this._configSubscribers.delete(subscriber);
		};
	}

	/**
	 * Cleans up and destroys ticker resources (e.g. terminates Web Worker).
	 */
	public destroy(): void {
		this.unsubscribe();
		this.unsubscribeEvents();
		this._configSubscribers.clear();
		this.ticker.destroy();
	}
}

/**
 * Factory function to create isolated TimerState instances (useful for testing or sub-contexts).
 */
export function createTimerState(
	config?: Partial<TimerConfig>,
	ticker?: ITimerTicker,
	audioNotifier?: IAudioNotifier,
	storage?: ISettingsStorage,
	timerRepository?: ITimerStateRepository,
	now?: () => number
): TimerState {
	return new TimerState(config, ticker, audioNotifier, storage, timerRepository, now);
}

/**
 * Global singleton reactive timer state instance for the application.
 */
export const timerState = new TimerState(
	undefined,
	undefined,
	undefined,
	new LocalSettingsStorage(),
	new LocalTimerStateRepository()
);
