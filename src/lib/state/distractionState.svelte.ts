import { SvelteDate } from 'svelte/reactivity';
import { NoopDistractionMonitor } from '../adapters/window/noop-distraction-monitor';
import { TauriDistractionMonitor } from '../adapters/window/tauri-distraction-monitor';
import { isTauriRuntimeAvailable } from '../adapters/window/tauri-window-shell';
import { NoopDistractionNotifier } from '../adapters/notification/noop-distraction-notifier';
import { TauriDistractionNotifier } from '../adapters/notification/tauri-distraction-notifier';
import { LocalStorageDistractionRuleRepository } from '../adapters/storage/local-distraction-rule-repository';
import { LocalStorageDistractionWhitelistRepository } from '../adapters/storage/local-distraction-whitelist-repository';
import { LocalSettingsStorage } from '../adapters/storage/local-settings-storage';
import { getLocalDateString } from '../adapters/storage/local-daily-stats-repository';
import type { IDistractionMonitor, OpenWindow } from '../domain/ports/distraction-monitor.port';
import type {
	IDistractionRuleRepository,
	IDistractionWhitelistRepository
} from '../domain/ports/distraction-repository.port';
import type { ISettingsStorage } from '../domain/ports/settings-storage.port';
import type {
	DistractionNotice,
	IDistractionNotifier
} from '../domain/ports/distraction-notifier.port';
import {
	type DistractionRule,
	matchesRule,
	sanitizeDistractionRule
} from '../domain/distraction/distraction-rule.entity';
import {
	DEFAULT_NOTIFY_POLICY,
	shouldNotify,
	type NoticeFired,
	type NotifyPolicy
} from '../domain/distraction/distraction-policy';
import type { TimerSnapshot, Unsubscribe } from '../domain/timer/timer-fsm';
import { t } from '$lib/state/locale.svelte';
import { timerState } from './timer.svelte';

/**
 * Poll cadence of the detector while a focus block runs (spec §4).
 *
 * Not exported on purpose: the tests pin the documented ~3 s with their own literal, so
 * changing this number is a decision that fails them instead of silently following along.
 */
const DISTRACTION_POLL_INTERVAL_MS = 3_000;

/**
 * What the user typed in the declaration form. The executable is normalized and the
 * pattern trimmed by the entity's sanitizer, so this is raw input, not a stored rule.
 *
 * `id` present means "edit that rule": its id and creation time are preserved.
 */
export interface DistractionRuleInput {
	readonly id?: string;
	readonly exe: string;
	readonly titlePattern?: string;
}

export interface DistractionStateOptions {
	readonly ruleRepository?: IDistractionRuleRepository;
	readonly whitelistRepository?: IDistractionWhitelistRepository;
	readonly settingsStorage?: ISettingsStorage;
	readonly monitor?: IDistractionMonitor;
	readonly notifier?: IDistractionNotifier;
	readonly timer?: DistractionTimerSource;
	/** Cadence of the notice (spec §3.4). Injected so tests can pin a tighter interval. */
	readonly policy?: NotifyPolicy;
	/** Injected clock: the daily silence key must be the local day, never UTC. */
	readonly now?: () => Date;
}

/**
 * The slice of the timer this state needs: when the poll is allowed to run.
 *
 * Structural, so the real `TimerState` and the domain `TimerFSM` both satisfy it: the
 * detector's only interest is a focus block in `Running` (spec §2 P3), never the timer's
 * configuration or its progress.
 */
export interface DistractionTimerSource {
	/** Current snapshot. Read once when the detector attaches, since subscribing emits nothing. */
	readonly snapshot: TimerSnapshot;

	/** Notifies on every transition of the timer, including start, pause, reset and tick. */
	subscribe(subscriber: (snapshot: TimerSnapshot) => void): Unsubscribe;
}

/**
 * Generates the key of a new rule. `crypto.randomUUID` is unavailable outside a secure
 * context, and the fallback only has to be unique among the user's declared rules,
 * not a valid RFC 4122 UUID: nothing else in the app consumes it.
 */
function createRuleId(now: Date): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return `rule-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Reactive state of the distraction detector (Svelte 5 Runes): the declared rules, the
 * silences of the current local day, the global switch, and the poll that evaluates the
 * cadence policy and shows the OS notice while a focus block runs (spec §4).
 *
 * It owns no native logic and no persistence format: every read and write goes through
 * the injected ports, exactly like `BreaksState`. Titles of observed windows are never
 * kept here — `openWindows()` is a pass-through read for the declaration picker and the
 * notice names the window it just observed, both discarded immediately (spec §2 P2).
 *
 * The loop arms only with the switch on, a focus block `running` and a platform that can
 * read other processes' windows; it disarms on pause, reset, block end, switch off, or a
 * new mode. Its notice history lives in memory and dies with the block.
 */
export class DistractionState {
	private readonly ruleRepository: IDistractionRuleRepository;
	private readonly whitelistRepository: IDistractionWhitelistRepository;
	private readonly settingsStorage: ISettingsStorage;
	private readonly monitor: IDistractionMonitor;
	private readonly notifier: IDistractionNotifier;
	private readonly policy: NotifyPolicy;
	private readonly now: () => Date;

	private _rules = $state<readonly DistractionRule[]>([]);
	private _silencedRuleIds = $state<readonly string[]>([]);
	private _enabled = $state<boolean>(false);
	private _isLoading = $state<boolean>(false);
	private _isLoaded = $state<boolean>(false);

	/** Notices already fired inside the block in progress: memory only, never persisted. */
	private notices: readonly NoticeFired[] = [];
	/** True only while a focus block of the timer is running (spec §2 P3). */
	private focusLive = false;
	private pollHandle: ReturnType<typeof setInterval> | null = null;
	private unsubscribeTimer: Unsubscribe | null = null;

	public readonly rules = $derived.by(() => this._rules);
	/**
	 * The rules silenced for today, intersected with the rules that still exist: "Nunca"
	 * deletes the rule (decisions.md §3.1), and a stale entry must not resurrect it.
	 */
	public readonly silencedRules = $derived.by(() => {
		const silenced = this._silencedRuleIds;
		return this._rules.filter((rule) => silenced.includes(rule.id));
	});

	constructor(options: DistractionStateOptions = {}) {
		this.ruleRepository = options.ruleRepository ?? new LocalStorageDistractionRuleRepository();
		this.whitelistRepository =
			options.whitelistRepository ?? new LocalStorageDistractionWhitelistRepository();
		this.settingsStorage = options.settingsStorage ?? new LocalSettingsStorage();
		this.monitor = options.monitor ?? createDefaultDistractionMonitor();
		this.notifier = options.notifier ?? createDefaultDistractionNotifier();
		this.policy = options.policy ?? DEFAULT_NOTIFY_POLICY;
		this.now = options.now ?? (() => new SvelteDate());

		// Seed the persisted switch eagerly, like `timer.svelte.ts` and `theme.svelte.ts`
		// read their settings in the constructor: the settings drawer renders
		// `enabled` on first paint, so a persisted ON preference must be visible
		// before the Distractions view ever mounts. `load()` re-reads the same
		// source, so seeding here stays idempotent.
		this._enabled = this.settingsStorage.loadSettings().distractionDetectorEnabled;

		if (options.timer) {
			this.attachTimer(options.timer);
		}
	}

	/** True only when the platform can read other processes' windows (spec §1). */
	public get isSupported(): boolean {
		return this.monitor.isSupported;
	}

	public get enabled(): boolean {
		return this._enabled;
	}

	public get isLoading(): boolean {
		return this._isLoading;
	}

	public get isLoaded(): boolean {
		return this._isLoaded;
	}

	/** Local calendar day (`YYYY-MM-DD`) the daily silences belong to. */
	public get todayKey(): string {
		return getLocalDateString(this.now());
	}

	/**
	 * Reads the three persisted sources into the reactive state. Idempotent, so the view
	 * can call it on every mount: the silences of the day are read again instead of being
	 * trusted from a stale in-memory copy.
	 */
	public async load(): Promise<void> {
		this._isLoading = true;
		try {
			this._enabled = this.settingsStorage.loadSettings().distractionDetectorEnabled;
			this._rules = [...(await this.ruleRepository.getAll())];
			this._silencedRuleIds = [...(await this.whitelistRepository.getSilenced(this.todayKey))];
			this._isLoaded = true;
		} finally {
			this._isLoading = false;
		}
	}

	/** Ephemeral read for the picker: never cached, never persisted. */
	public async openWindows(): Promise<readonly OpenWindow[]> {
		return this.monitor.listOpenWindows();
	}

	/**
	 * Declares a new rule or edits an existing one. Returns `false` when the input cannot
	 * become a rule (a blank executable, for instance) instead of throwing at the UI.
	 */
	public async saveRule(input: DistractionRuleInput): Promise<boolean> {
		const existing = input.id ? this._rules.find((rule) => rule.id === input.id) : undefined;
		const createdAt = existing?.createdAt ?? this.now().getTime();

		const rule = sanitizeDistractionRule({
			id: existing?.id ?? createRuleId(this.now()),
			exe: input.exe,
			titlePattern: input.titlePattern,
			createdAt
		});

		if (rule === null) {
			return false;
		}

		await this.ruleRepository.save(rule);

		this._rules = existing
			? this._rules.map((current) => (current.id === rule.id ? rule : current))
			: [...this._rules, rule];

		return true;
	}

	/** Removes a rule from the catalog: the same gesture that makes "Nunca" permanent. */
	public async deleteRule(ruleId: string): Promise<void> {
		await this.ruleRepository.delete(ruleId);
		this._rules = this._rules.filter((rule) => rule.id !== ruleId);
	}

	public async silenceRule(ruleId: string): Promise<void> {
		await this.whitelistRepository.silence(ruleId, this.todayKey);
		await this.refreshSilences();
	}

	public async unsilenceRule(ruleId: string): Promise<void> {
		await this.whitelistRepository.unsilence(ruleId, this.todayKey);
		await this.refreshSilences();
	}

	/** Persists the global switch. Off by default: the user opts in. */
	public setEnabled(enabled: boolean): void {
		this._enabled = enabled;
		this.settingsStorage.saveSettings({ distractionDetectorEnabled: enabled });

		if (enabled) {
			// The switch is the user's explicit opt-in, so this is where the OS is asked for
			// the notification permission (spec §13).
			void this.ensureNotificationPermission();
		}

		this.syncLoop();
	}

	/**
	 * Wires the timer that decides when the poll may run.
	 *
	 * The current snapshot is read once because subscribing emits nothing: a detector built
	 * while a focus block is already running must arm right away.
	 */
	private attachTimer(timer: DistractionTimerSource): void {
		this.unsubscribeTimer?.();
		this.unsubscribeTimer = timer.subscribe((snapshot) => this.onTimerSnapshot(snapshot));
		this.onTimerSnapshot(timer.snapshot);
	}

	/**
	 * Arms or disarms the poll from the timer's own transitions (spec §4): only a focus block
	 * in `Running` watches windows, and ending, pausing, restarting or skipping it disarms at
	 * once. The notice history dies with the block, so the next block starts clean.
	 */
	private onTimerSnapshot(snapshot: TimerSnapshot): void {
		const live = snapshot.state === 'running' && snapshot.mode === 'focus';
		if (live === this.focusLive) {
			return;
		}

		this.focusLive = live;
		if (!live) {
			this.notices = [];
		}

		this.syncLoop();
	}

	private syncLoop(): void {
		if (this._enabled && this.focusLive && this.isSupported) {
			this.arm();
			return;
		}

		this.disarm();
	}

	private arm(): void {
		if (this.pollHandle !== null) {
			return;
		}

		this.pollHandle = setInterval(() => {
			void this.evaluate();
		}, DISTRACTION_POLL_INTERVAL_MS);
	}

	private disarm(): void {
		if (this.pollHandle === null) {
			return;
		}

		clearInterval(this.pollHandle);
		this.pollHandle = null;
	}

	/**
	 * One round of the loop: read the foreground window and let every declared rule that
	 * matches and is not silenced ask the policy.
	 *
	 * Rules are independent by design (spec §3.4), and the rules, the silences of the day and
	 * the window are all read fresh on every round — which is what makes declaring, editing or
	 * deleting a rule take effect inside the block without restarting anything.
	 */
	private async evaluate(): Promise<void> {
		try {
			if (!this._enabled || !this.focusLive) {
				return;
			}

			const observation = await this.monitor.getForegroundWindow();
			if (observation === null) {
				// No valid window to judge: Pomody itself in front, an unreadable elevated
				// process, or the web no-op monitor (spec §4, §8).
				return;
			}

			const silenced = this._silencedRuleIds;
			for (const rule of this._rules) {
				if (silenced.includes(rule.id) || !matchesRule(rule, observation)) {
					continue;
				}

				const now = this.now().getTime();
				if (
					!shouldNotify({
						ruleId: rule.id,
						observation,
						firedThisBlock: this.notices,
						now,
						policy: this.policy
					})
				) {
					continue;
				}

				this.notices = [...this.notices, { ruleId: rule.id, firedAt: now }];
				await this.notifier.notify(buildNotice(observation.title));
			}
		} catch {
			// A failing poll must never break the focus block, and a timer callback must never
			// reject: the next round retries (spec §4).
		}
	}

	/** Best effort, once the user opts in: a refused permission never blocks the switch. */
	private async ensureNotificationPermission(): Promise<void> {
		if (!this.notifier.isSupported) {
			return;
		}

		try {
			await this.notifier.requestPermission();
		} catch {
			// The notice degrades to nothing; the detector itself keeps working.
		}
	}

	private async refreshSilences(): Promise<void> {
		this._silencedRuleIds = [...(await this.whitelistRepository.getSilenced(this.todayKey))];
	}
}

/**
 * Notice copy (spec §5). Built here, in the frontend, so it goes through Paraglide and both
 * languages are covered by the repo's translation flow; the observed window title is passed
 * through and never stored.
 */
function buildNotice(windowTitle: string): DistractionNotice {
	return {
		title: t.distraction_notice_title(),
		body: t.distraction_notice_body({ window: windowTitle })
	};
}

/**
 * Selects the monitor matching the current runtime: the native Windows bridge on
 * desktop, the safe no-op on the web (spec §3.1), mirroring `createDefaultWindowShell`.
 */
export function createDefaultDistractionMonitor(): IDistractionMonitor {
	return isTauriRuntimeAvailable() ? new TauriDistractionMonitor() : new NoopDistractionMonitor();
}

/**
 * Selects the notice channel matching the current runtime, mirroring
 * `createDefaultDistractionMonitor`.
 */
export function createDefaultDistractionNotifier(): IDistractionNotifier {
	return isTauriRuntimeAvailable() ? new TauriDistractionNotifier() : new NoopDistractionNotifier();
}

/** Factory for isolated instances (tests, sub-contexts). */
export function createDistractionState(options: DistractionStateOptions = {}): DistractionState {
	return new DistractionState(options);
}

/**
 * Global singleton consumed by the view, the header tab and the settings switch.
 *
 * It is wired to `timerState` here and nowhere else: the app already has one timer, and the
 * detector's only use for it is knowing when a focus block runs (spec §4).
 */
export const distractionState = createDistractionState({ timer: timerState });
