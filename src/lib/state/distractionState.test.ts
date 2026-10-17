import { describe, it, expect, vi, afterEach } from 'vitest';
import { NoopDistractionMonitor } from '$lib/adapters/window/noop-distraction-monitor';
import { TauriDistractionMonitor } from '$lib/adapters/window/tauri-distraction-monitor';
import type { IDistractionMonitor } from '$lib/domain/ports/distraction-monitor.port';
import type { DistractionRule } from '$lib/domain/distraction/distraction-rule.entity';
import { FakeDistractionMonitor } from '$tests/fakes/platform/fake-distraction-monitor';
import { FakeDistractionRuleRepository } from '$tests/fakes/repositories/fake-distraction-rule-repository';
import { FakeDistractionWhitelistRepository } from '$tests/fakes/repositories/fake-distraction-whitelist-repository';
import { FakeSettingsStorage } from '$tests/fakes/repositories/fake-settings-storage';
import { createDefaultDistractionMonitor, createDistractionState } from './distractionState.svelte';

/** 2026-10-16, 10:00 local time — the day every state test runs on. */
const NOW = new Date(2026, 9, 16, 10, 0, 0);
const TODAY_KEY = '2026-10-16';

function makeRule(overrides: Partial<DistractionRule> = {}): DistractionRule {
	return {
		id: 'rule-1',
		exe: 'chrome',
		createdAt: NOW.getTime() - 1000,
		...overrides
	};
}

function createHarness(
	options: {
		rules?: readonly DistractionRule[];
		silencedUntil?: string;
		silencedRuleIds?: readonly string[];
		detectorEnabled?: boolean;
		monitor?: IDistractionMonitor;
	} = {}
) {
	const ruleRepository = new FakeDistractionRuleRepository(options.rules);
	const whitelistRepository = new FakeDistractionWhitelistRepository(
		options.silencedUntil !== undefined
			? { silencedUntil: options.silencedUntil, ruleIds: options.silencedRuleIds ?? [] }
			: undefined
	);
	const settingsStorage = new FakeSettingsStorage({
		distractionDetectorEnabled: options.detectorEnabled ?? false
	});
	const monitor = options.monitor ?? new FakeDistractionMonitor();

	const state = createDistractionState({
		ruleRepository,
		whitelistRepository,
		settingsStorage,
		monitor,
		now: () => NOW
	});

	return { state, ruleRepository, whitelistRepository, settingsStorage, monitor };
}

describe('createDefaultDistractionMonitor', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('should fall back to the no-op monitor outside a Tauri runtime', () => {
		const monitor = createDefaultDistractionMonitor();

		expect(monitor).toBeInstanceOf(NoopDistractionMonitor);
		expect(monitor.isSupported).toBe(false);
	});

	it('should select the Tauri monitor when the Tauri runtime is present', () => {
		vi.stubGlobal('__TAURI_INTERNALS__', { invoke: () => Promise.resolve(null) });

		expect(createDefaultDistractionMonitor()).toBeInstanceOf(TauriDistractionMonitor);
	});
});

describe('DistractionState', () => {
	describe('capability', () => {
		it('reports the monitor capability instead of assuming support', () => {
			expect(createHarness().state.isSupported).toBe(true);
			expect(
				createHarness({ monitor: new FakeDistractionMonitor({ isSupported: false }) }).state
					.isSupported
			).toBe(false);
			expect(createHarness({ monitor: new NoopDistractionMonitor() }).state.isSupported).toBe(
				false
			);
		});
	});

	describe('load', () => {
		it('loads nothing and leaves the switch off when no state was persisted', async () => {
			const { state } = createHarness();

			await state.load();

			expect(state.rules).toEqual([]);
			expect(state.silencedRules).toEqual([]);
			expect(state.enabled).toBe(false);
			expect(state.isLoaded).toBe(true);
			expect(state.isLoading).toBe(false);
		});

		it('loads the declared rules, the silences of today and the persisted switch', async () => {
			const rule = makeRule();
			const { state } = createHarness({
				rules: [rule],
				silencedUntil: TODAY_KEY,
				silencedRuleIds: [rule.id],
				detectorEnabled: true
			});

			await state.load();

			expect(state.rules).toEqual([rule]);
			expect(state.silencedRules).toEqual([rule]);
			expect(state.enabled).toBe(true);
		});

		it('shows no silenced rule when the stored silence belongs to another day', async () => {
			const rule = makeRule();
			const { state } = createHarness({
				rules: [rule],
				silencedUntil: '2026-10-15',
				silencedRuleIds: [rule.id]
			});

			await state.load();

			expect(state.rules).toEqual([rule]);
			expect(state.silencedRules).toEqual([]);
		});
	});

	describe('saveRule', () => {
		it('declares a rule with the executable normalized and the pattern trimmed', async () => {
			const { state, ruleRepository } = createHarness();

			const saved = await state.saveRule({
				exe: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.EXE',
				titlePattern: '  YouTube  '
			});

			expect(saved).toBe(true);
			expect(ruleRepository.saveCalls).toHaveLength(1);
			const persisted = ruleRepository.saveCalls[0];
			expect(persisted.exe).toBe('chrome');
			expect(persisted.titlePattern).toBe('YouTube');
			expect(persisted.createdAt).toBe(NOW.getTime());
			expect(persisted.id.length).toBeGreaterThan(0);
			// Only rules are persisted: never the observed window title (spec §2 P2).
			expect(Object.keys(persisted).sort()).toEqual(['createdAt', 'exe', 'id', 'titlePattern']);
			expect(state.rules).toEqual([persisted]);
		});

		it('rejects a rule whose executable normalizes to nothing', async () => {
			const { state, ruleRepository } = createHarness();

			const saved = await state.saveRule({ exe: '   ' });

			expect(saved).toBe(false);
			expect(ruleRepository.saveCalls).toEqual([]);
			expect(state.rules).toEqual([]);
		});

		it('stores a whitespace-only pattern as absent instead of a never-matching value', async () => {
			const { state, ruleRepository } = createHarness();

			const saved = await state.saveRule({ exe: 'steam', titlePattern: '   ' });

			expect(saved).toBe(true);
			expect('titlePattern' in ruleRepository.saveCalls[0]).toBe(false);
			expect(state.rules[0].titlePattern).toBeUndefined();
		});

		it('updates an existing rule in place, keeping its id and creation time', async () => {
			const rule = makeRule();
			const { state, ruleRepository } = createHarness({ rules: [rule] });
			await state.load();

			const saved = await state.saveRule({ id: rule.id, exe: 'Steam', titlePattern: 'Store' });

			expect(saved).toBe(true);
			expect(state.rules).toHaveLength(1);
			expect(state.rules[0]).toEqual({
				id: rule.id,
				exe: 'steam',
				titlePattern: 'Store',
				createdAt: rule.createdAt
			});
			expect(ruleRepository.saveCalls).toHaveLength(1);
		});
	});

	describe('deleteRule', () => {
		it('removes the rule from the catalog and from the visible list', async () => {
			const rule = makeRule();
			const { state, ruleRepository } = createHarness({ rules: [rule] });
			await state.load();

			await state.deleteRule(rule.id);

			expect(ruleRepository.deleteCalls).toEqual([rule.id]);
			await expect(ruleRepository.getAll()).resolves.toEqual([]);
			expect(state.rules).toEqual([]);
		});
	});

	describe('daily silences', () => {
		it('silences a rule for the current local day and releases it on demand', async () => {
			const rule = makeRule();
			const { state, whitelistRepository } = createHarness({ rules: [rule] });
			await state.load();

			await state.silenceRule(rule.id);

			expect(whitelistRepository.silenceCalls).toEqual([{ ruleId: rule.id, dateKey: TODAY_KEY }]);
			expect(state.silencedRules).toEqual([rule]);

			await state.unsilenceRule(rule.id);

			expect(whitelistRepository.unsilenceCalls).toEqual([{ ruleId: rule.id, dateKey: TODAY_KEY }]);
			expect(state.silencedRules).toEqual([]);
		});

		it('does not list a silence whose rule no longer exists', async () => {
			const rule = makeRule();
			const { state } = createHarness({
				rules: [rule],
				silencedUntil: TODAY_KEY,
				silencedRuleIds: [rule.id, 'deleted-rule']
			});

			await state.load();

			expect(state.silencedRules).toEqual([rule]);
		});
	});

	describe('global switch', () => {
		it('persists the switch and reloads it as enabled', async () => {
			const { state, settingsStorage } = createHarness();

			state.setEnabled(true);

			expect(state.enabled).toBe(true);
			expect(settingsStorage.saveSettingsCalls).toEqual([{ distractionDetectorEnabled: true }]);

			const reloaded = createHarness({ detectorEnabled: true }).state;
			await reloaded.load();

			expect(reloaded.enabled).toBe(true);
		});
	});

	describe('openWindows', () => {
		it('lists the open windows through the monitor', async () => {
			const windows = [
				{ exe: 'chrome', title: 'YouTube — Google Chrome' },
				{ exe: 'steam', title: 'Steam' }
			];
			const { state, monitor } = createHarness({
				monitor: new FakeDistractionMonitor({ windows })
			});

			await expect(state.openWindows()).resolves.toEqual(windows);
			expect((monitor as FakeDistractionMonitor).listCalls).toBe(1);
		});
	});
});
