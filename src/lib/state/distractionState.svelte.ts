import { SvelteDate } from 'svelte/reactivity';
import { NoopDistractionMonitor } from '../adapters/window/noop-distraction-monitor';
import { TauriDistractionMonitor } from '../adapters/window/tauri-distraction-monitor';
import { isTauriRuntimeAvailable } from '../adapters/window/tauri-window-shell';
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
import {
	type DistractionRule,
	sanitizeDistractionRule
} from '../domain/distraction/distraction-rule.entity';

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
	/** Injected clock: the daily silence key must be the local day, never UTC. */
	readonly now?: () => Date;
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
 * silences of the current local day and the global switch.
 *
 * It owns no native logic and no persistence format: every read and write goes through
 * the injected ports, exactly like `BreaksState`. Titles of observed windows are never
 * kept here — `openWindows()` is a pass-through read for the declaration picker, and its
 * result is discarded by the view (spec §2 P2).
 *
 * The poll loop and the evaluation against the policy are slice 5.5; this module is its
 * composition root.
 */
export class DistractionState {
	private readonly ruleRepository: IDistractionRuleRepository;
	private readonly whitelistRepository: IDistractionWhitelistRepository;
	private readonly settingsStorage: ISettingsStorage;
	private readonly monitor: IDistractionMonitor;
	private readonly now: () => Date;

	private _rules = $state<readonly DistractionRule[]>([]);
	private _silencedRuleIds = $state<readonly string[]>([]);
	private _enabled = $state<boolean>(false);
	private _isLoading = $state<boolean>(false);
	private _isLoaded = $state<boolean>(false);

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
		this.now = options.now ?? (() => new SvelteDate());

		// Seed the persisted switch eagerly, like `timer.svelte.ts` and `theme.svelte.ts`
		// read their settings in the constructor: the settings drawer renders
		// `enabled` on first paint, so a persisted ON preference must be visible
		// before the Distractions view ever mounts. `load()` re-reads the same
		// source, so seeding here stays idempotent.
		this._enabled = this.settingsStorage.loadSettings().distractionDetectorEnabled;
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
	}

	private async refreshSilences(): Promise<void> {
		this._silencedRuleIds = [...(await this.whitelistRepository.getSilenced(this.todayKey))];
	}
}

/**
 * Selects the monitor matching the current runtime: the native Windows bridge on
 * desktop, the safe no-op on the web (spec §3.1), mirroring `createDefaultWindowShell`.
 */
export function createDefaultDistractionMonitor(): IDistractionMonitor {
	return isTauriRuntimeAvailable() ? new TauriDistractionMonitor() : new NoopDistractionMonitor();
}

/** Factory for isolated instances (tests, sub-contexts). */
export function createDistractionState(options: DistractionStateOptions = {}): DistractionState {
	return new DistractionState(options);
}

/** Global singleton consumed by the view, the header tab and the settings switch. */
export const distractionState = createDistractionState();
