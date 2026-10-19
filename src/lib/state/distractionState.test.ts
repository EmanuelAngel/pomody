import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { NoopDistractionMonitor } from '$lib/adapters/window/noop-distraction-monitor';
import { TauriDistractionMonitor } from '$lib/adapters/window/tauri-distraction-monitor';
import type {
	IDistractionMonitor,
	WindowObservation
} from '$lib/domain/ports/distraction-monitor.port';
import type { DistractionRule } from '$lib/domain/distraction/distraction-rule.entity';
import { TimerFSM } from '$lib/domain/timer/timer-fsm';
import * as m from '$lib/paraglide/messages';
import { FakeDistractionMonitor } from '$tests/fakes/platform/fake-distraction-monitor';
import { FakeDistractionNotifier } from '$tests/fakes/platform/fake-distraction-notifier';
import { NoopDistractionNotifier } from '$lib/adapters/notification/noop-distraction-notifier';
import { TauriDistractionNotifier } from '$lib/adapters/notification/tauri-distraction-notifier';
import { FakeDistractionRuleRepository } from '$tests/fakes/repositories/fake-distraction-rule-repository';
import { FakeDistractionWhitelistRepository } from '$tests/fakes/repositories/fake-distraction-whitelist-repository';
import { FakeSettingsStorage } from '$tests/fakes/repositories/fake-settings-storage';
import { FakeAudioNotifier } from '$tests/fakes/engine/fake-audio-notifier';
import {
	createDefaultDistractionMonitor,
	createDefaultDistractionNotifier,
	createDistractionState
} from './distractionState.svelte';

/** 2026-10-16, 10:00 local time — the day every state test runs on. */
const NOW = new Date(2026, 9, 16, 10, 0, 0);
const TODAY_KEY = '2026-10-16';

/** Lets the promises the state fires without awaiting settle before the assertion. */
async function flush(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
}

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
		audioNotifier?: FakeAudioNotifier;
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
	const audioNotifier = options.audioNotifier ?? new FakeAudioNotifier();

	const state = createDistractionState({
		ruleRepository,
		whitelistRepository,
		settingsStorage,
		monitor,
		audioNotifier,
		now: () => NOW
	});

	return { state, ruleRepository, whitelistRepository, settingsStorage, monitor, audioNotifier };
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

describe('createDefaultDistractionNotifier', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('should fall back to the no-op notifier outside a Tauri runtime', () => {
		const notifier = createDefaultDistractionNotifier();

		expect(notifier).toBeInstanceOf(NoopDistractionNotifier);
		expect(notifier.isSupported).toBe(false);
	});

	it('should select the Tauri notifier when the Tauri runtime is present', () => {
		vi.stubGlobal('__TAURI_INTERNALS__', { invoke: () => Promise.resolve(null) });

		expect(createDefaultDistractionNotifier()).toBeInstanceOf(TauriDistractionNotifier);
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
		it('seeds the persisted switch eagerly, before any load() call', () => {
			const { state } = createHarness({ detectorEnabled: true });

			// No load() has run: the storage value must already be visible so the
			// settings drawer renders the correct state on a cold start.
			expect(state.enabled).toBe(true);
			expect(createHarness().state.enabled).toBe(false);
		});

		it('persists the switch and reloads it as enabled', async () => {
			const { state, settingsStorage } = createHarness();

			state.setEnabled(true);

			expect(state.enabled).toBe(true);
			expect(settingsStorage.saveSettingsCalls).toEqual([{ distractionDetectorEnabled: true }]);

			const reloaded = createHarness({ detectorEnabled: true }).state;
			await reloaded.load();

			expect(reloaded.enabled).toBe(true);
		});

		it('unlocks audio context when switch is turned on', () => {
			const { state, audioNotifier } = createHarness();

			expect(audioNotifier.unlockCallCount).toBe(0);

			state.setEnabled(true);

			expect(audioNotifier.unlockCallCount).toBe(1);
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

	/**
	 * The poll loop of slice 5.5 (issue #127, spec §4).
	 *
	 * The timer is the real `TimerFSM`, because the composition root's contract with it —
	 * "arm only while a focus block is running" — is exactly what these tests have to pin,
	 * and the fake would only re-state it. The clock and the interval advance together.
	 */
	describe('poll loop', () => {
		const CHROME_WINDOW: WindowObservation = {
			exe: 'chrome',
			title: 'YouTube — Google Chrome',
			idleSeconds: 5
		};

		async function createLoopHarness(
			options: {
				rules?: readonly DistractionRule[];
				silencedRuleIds?: readonly string[];
				detectorEnabled?: boolean;
				soundEnabled?: boolean;
				foregroundWindow?: WindowObservation | null;
				monitorSupported?: boolean;
				notifier?: FakeDistractionNotifier;
				audioNotifier?: FakeAudioNotifier;
			} = {}
		) {
			const timer = new TimerFSM();
			const monitor = new FakeDistractionMonitor({
				isSupported: options.monitorSupported ?? true,
				foregroundWindow:
					options.foregroundWindow === undefined ? CHROME_WINDOW : options.foregroundWindow
			});
			const notifier = options.notifier ?? new FakeDistractionNotifier();
			const audioNotifier = options.audioNotifier ?? new FakeAudioNotifier();
			const ruleRepository = new FakeDistractionRuleRepository(options.rules);
			const whitelistRepository = new FakeDistractionWhitelistRepository(
				options.silencedRuleIds !== undefined
					? { silencedUntil: TODAY_KEY, ruleIds: options.silencedRuleIds }
					: undefined
			);
			const settingsStorage = new FakeSettingsStorage({
				distractionDetectorEnabled: options.detectorEnabled ?? true,
				soundEnabled: options.soundEnabled ?? true
			});

			let clock = NOW.getTime();
			const state = createDistractionState({
				ruleRepository,
				whitelistRepository,
				settingsStorage,
				monitor,
				notifier,
				audioNotifier,
				timer,
				now: () => new Date(clock)
			});
			await state.load();

			/** Advances the injected clock and the poll interval together, as real time would. */
			async function advance(ms: number): Promise<void> {
				clock += ms;
				await vi.advanceTimersByTimeAsync(ms);
			}

			return {
				state,
				timer,
				monitor,
				notifier,
				audioNotifier,
				ruleRepository,
				whitelistRepository,
				advance
			};
		}

		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('polls only while a focus block is running, and disarms on pause, reset and block end', async () => {
			const { timer, monitor, advance } = await createLoopHarness();

			await advance(30_000);
			expect(monitor.foregroundCalls).toBe(0);

			timer.start();
			await advance(10_000);
			expect(monitor.foregroundCalls).toBe(1);

			timer.pause();
			await advance(30_000);
			expect(monitor.foregroundCalls).toBe(1);

			timer.resume();
			await advance(10_000);
			expect(monitor.foregroundCalls).toBe(2);

			timer.reset();
			await advance(30_000);
			expect(monitor.foregroundCalls).toBe(2);

			timer.start();
			await advance(10_000);
			timer.tick(1_500_000);
			await advance(30_000);
			expect(monitor.foregroundCalls).toBe(3);
		});

		it('never polls during a break block', async () => {
			const { timer, monitor, advance } = await createLoopHarness();

			timer.start();
			timer.tick(1_500_000);
			timer.start();
			const breakMode = timer.snapshot.mode;

			await advance(30_000);

			expect(breakMode).toBe('shortBreak');
			expect(monitor.foregroundCalls).toBe(0);
		});

		it('never polls in the web degradation, where the monitor reads no windows', async () => {
			const { timer, monitor, advance } = await createLoopHarness({ monitorSupported: false });

			timer.start();
			await advance(9_000);

			expect(monitor.foregroundCalls).toBe(0);
		});

		it('disarms the instant the switch goes off, and never fires while it is off', async () => {
			const { state, timer, monitor, notifier, advance } = await createLoopHarness({
				rules: [makeRule()]
			});

			timer.start();
			await advance(10_000);
			expect(notifier.notifyCalls).toHaveLength(1);

			state.setEnabled(false);
			await advance(30_000);

			expect(notifier.notifyCalls).toHaveLength(1);
			expect(monitor.foregroundCalls).toBe(1);

			// The notice history belongs to the block, not to the switch: turning it back on
			// neither replays what was missed nor repeats what this block already announced.
			state.setEnabled(true);
			await advance(10_000);

			expect(notifier.notifyCalls).toHaveLength(1);
		});

		it('evaluates fresh when the switch goes back on instead of replaying what it missed', async () => {
			const { state, timer, notifier, advance } = await createLoopHarness({
				rules: [makeRule()],
				detectorEnabled: false
			});

			timer.start();
			await advance(20_000);
			expect(notifier.notifyCalls).toHaveLength(0);

			state.setEnabled(true);
			await advance(10_000);

			// Nothing that happened while the switch was off is replayed: the single notice is
			// the current window being declared, evaluated from scratch (spec §4).
			expect(notifier.notifyCalls).toHaveLength(1);
		});

		it('notifies once per rule and holds the interval between two notices of the same rule', async () => {
			const { timer, notifier, advance } = await createLoopHarness({ rules: [makeRule()] });

			timer.start();
			await advance(10_000);
			expect(notifier.notifyCalls).toHaveLength(1);

			await advance(60_000);
			expect(notifier.notifyCalls).toHaveLength(1);

			await advance(60_000);
			expect(notifier.notifyCalls).toHaveLength(2);
		});

		it('keeps each rule on its own cadence', async () => {
			const chrome = makeRule({ id: 'rule-chrome', exe: 'chrome' });
			const steam = makeRule({ id: 'rule-steam', exe: 'steam' });
			const { timer, monitor, notifier, advance } = await createLoopHarness({
				rules: [chrome, steam]
			});

			timer.start();
			await advance(10_000);
			expect(notifier.notifyCalls).toHaveLength(1);

			monitor.foregroundWindow = { ...CHROME_WINDOW, exe: 'steam', title: 'Steam' };
			await advance(10_000);
			expect(notifier.notifyCalls).toHaveLength(2);

			// Back to the first rule: its own interval is what counts, not the rule that fired last.
			monitor.foregroundWindow = CHROME_WINDOW;
			await advance(10_000);
			expect(notifier.notifyCalls).toHaveLength(2);
		});

		it('emits nothing while the idle guard holds and resumes below it', async () => {
			const { timer, monitor, notifier, advance } = await createLoopHarness({
				rules: [makeRule()],
				foregroundWindow: { ...CHROME_WINDOW, idleSeconds: 300 }
			});

			timer.start();
			await advance(10_000);
			expect(notifier.notifyCalls).toHaveLength(0);

			monitor.foregroundWindow = { ...CHROME_WINDOW, idleSeconds: 299 };
			await advance(10_000);
			expect(notifier.notifyCalls).toHaveLength(1);
		});

		it('skips a rule silenced for today, and honours a silence taken during the block', async () => {
			const rule = makeRule();
			const { state, timer, notifier, advance } = await createLoopHarness({
				rules: [rule],
				silencedRuleIds: [rule.id]
			});

			timer.start();
			await advance(10_000);
			expect(notifier.notifyCalls).toHaveLength(0);

			await state.unsilenceRule(rule.id);
			await advance(10_000);
			expect(notifier.notifyCalls).toHaveLength(1);

			await state.silenceRule(rule.id);
			await advance(120_000);
			expect(notifier.notifyCalls).toHaveLength(1);
		});

		it('picks up a rule declared during the block, and drops one deleted during the block', async () => {
			const { state, timer, notifier, advance } = await createLoopHarness();

			timer.start();
			await advance(10_000);
			expect(notifier.notifyCalls).toHaveLength(0);

			await state.saveRule({ exe: 'chrome' });
			await advance(10_000);
			expect(notifier.notifyCalls).toHaveLength(1);

			await state.deleteRule(state.rules[0].id);
			await advance(120_000);
			expect(notifier.notifyCalls).toHaveLength(1);
		});

		it('discards the block notice history when the block ends', async () => {
			const { timer, notifier, advance } = await createLoopHarness({ rules: [makeRule()] });

			timer.start();
			await advance(10_000);
			expect(notifier.notifyCalls).toHaveLength(1);

			timer.tick(1_500_000);
			timer.start();
			timer.tick(300_000);
			timer.start();
			await advance(10_000);

			// A new focus block starts with an empty history, so the same rule can fire at once.
			expect(notifier.notifyCalls).toHaveLength(2);
		});

		it('does nothing when there is no valid foreground window', async () => {
			const { timer, notifier, advance } = await createLoopHarness({
				rules: [makeRule()],
				foregroundWindow: null
			});

			timer.start();
			await advance(30_000);

			expect(notifier.notifyCalls).toHaveLength(0);
		});

		it('builds the notice from i18n naming the observed window, and persists no window title', async () => {
			const { timer, notifier, ruleRepository, whitelistRepository, advance } =
				await createLoopHarness({ rules: [makeRule()] });

			timer.start();
			await advance(10_000);

			expect(notifier.notifyCalls).toEqual([
				{
					title: m.distraction_notice_title(),
					body: m.distraction_notice_body({ window: CHROME_WINDOW.title }),
					// The rule travels with the notice: it is what its buttons act upon.
					ruleId: 'rule-1'
				}
			]);
			expect(notifier.notifyCalls[0].body).toContain(CHROME_WINDOW.title);
			expect(ruleRepository.saveCalls).toEqual([]);
			expect(whitelistRepository.silenceCalls).toEqual([]);
		});

		it('asks for the notification permission when the switch goes on', async () => {
			const notifier = new FakeDistractionNotifier({ permissionGranted: false });
			const { state } = await createLoopHarness({ detectorEnabled: false, notifier });

			state.setEnabled(true);

			expect(notifier.requestPermissionCalls).toBe(1);
		});

		it('never asks for a notification permission the platform cannot grant', async () => {
			const notifier = new FakeDistractionNotifier({ isSupported: false });
			const { state } = await createLoopHarness({ detectorEnabled: false, notifier });

			state.setEnabled(true);

			expect(notifier.requestPermissionCalls).toBe(0);
		});

		/**
		 * Finding 1 of the independent verification of `6aeab5f`: the switch is seeded from
		 * storage, so a detector that starts enabled never went through `setEnabled(true)`
		 * and, on Windows, nothing ever asked the OS for the permission. The notice was then
		 * dropped in silence for the whole session.
		 */
		it('asks for the permission on a cold start where the switch is already on', async () => {
			const notifier = new FakeDistractionNotifier({ permissionGranted: false });

			await createLoopHarness({ detectorEnabled: true, notifier });

			expect(notifier.requestPermissionCalls).toBe(1);
		});

		/**
		 * Finding 2 of the same verification: a pause is not the end of the block, so the
		 * history must survive it (spec §4 — the block in progress is immutable). The rule
		 * was re-announced inside the same block, and inside the five-minute interval, every
		 * time the user resumed.
		 */
		it('keeps the cadence of a focus block across a pause and resume', async () => {
			const { timer, notifier, advance } = await createLoopHarness({ rules: [makeRule()] });

			timer.start();
			await advance(10_000);
			expect(notifier.notifyCalls).toHaveLength(1);

			timer.pause();
			await advance(30_000);
			timer.resume();
			await advance(10_000);
			expect(notifier.notifyCalls).toHaveLength(1);

			// Still inside the 2-minute interval of the first notice, counted from the block, not the resume.
			await advance(70_000);
			expect(notifier.notifyCalls).toHaveLength(1);

			await advance(10_000);
			expect(notifier.notifyCalls).toHaveLength(2);
		});

		it('starts the next focus block with a clean history when the block is reset', async () => {
			const { timer, notifier, advance } = await createLoopHarness({ rules: [makeRule()] });

			timer.start();
			await advance(10_000);
			expect(notifier.notifyCalls).toHaveLength(1);

			timer.reset();
			timer.start();
			await advance(10_000);

			expect(notifier.notifyCalls).toHaveLength(2);
		});

		it('plays double attention chime when distraction notice is fired', async () => {
			const { timer, audioNotifier, advance } = await createLoopHarness({
				rules: [makeRule()]
			});

			timer.start();
			await advance(10_000);

			expect(audioNotifier.notifyDistractionCalls).toBe(1);
		});

		it('does not play distraction chime when sound is disabled in settings', async () => {
			const { timer, audioNotifier, advance } = await createLoopHarness({
				rules: [makeRule()],
				soundEnabled: false
			});

			timer.start();
			await advance(10_000);

			expect(audioNotifier.notifyDistractionCalls).toBe(0);
		});

		describe('the three actions of the toast', () => {
			it('declares them in the user language, under the notice they belong to', async () => {
				const notifier = new FakeDistractionNotifier();

				await createLoopHarness({ notifier });

				expect(notifier.registerActionsCalls).toEqual([
					[
						{ id: 'ack', title: m.distraction_notice_action_ack() },
						{ id: 'silence_day', title: m.distraction_notice_action_silence_day() },
						{ id: 'silence_permanent', title: m.distraction_notice_action_silence_permanent() }
					]
				]);
			});

			it('declares nothing where the platform cannot draw or report the buttons', async () => {
				const notifier = new FakeDistractionNotifier({ supportsActions: false });

				await createLoopHarness({ notifier });

				expect(notifier.registerActionsCalls).toEqual([]);
			});

			it('writes nothing when "Gracias" is picked: fading the notice means the same thing', async () => {
				const rule = makeRule();
				const notifier = new FakeDistractionNotifier();
				const { whitelistRepository, ruleRepository } = await createLoopHarness({
					rules: [rule],
					notifier
				});

				notifier.emitAction('ack', rule.id);

				expect(whitelistRepository.silenceCalls).toEqual([]);
				expect(ruleRepository.deleteCalls).toEqual([]);
			});

			it('silences that rule until the local day changes when "Hoy no" is picked', async () => {
				const rule = makeRule();
				const notifier = new FakeDistractionNotifier();
				const { state, whitelistRepository } = await createLoopHarness({ rules: [rule], notifier });

				notifier.emitAction('silence_day', rule.id);
				await flush();

				expect(whitelistRepository.silenceCalls).toEqual([{ ruleId: rule.id, dateKey: TODAY_KEY }]);
				expect(state.silencedRules.map((current) => current.id)).toEqual([rule.id]);
			});

			it('deletes the rule when "Nunca" is picked: its absence is what makes it permanent', async () => {
				const rule = makeRule();
				const notifier = new FakeDistractionNotifier();
				const { state, ruleRepository } = await createLoopHarness({ rules: [rule], notifier });

				notifier.emitAction('silence_permanent', rule.id);
				await flush();

				expect(ruleRepository.deleteCalls).toEqual([rule.id]);
				expect(state.rules).toEqual([]);
			});
		});

		/**
		 * Known consequence, not an endorsed behaviour: `saveRule` mints a new id per save and
		 * the repository upserts by id, so two identical rules coexist and each one fires its
		 * own notice for the same distraction (L18 of `odd/tasks/distraction-detector.md`).
		 * The product decision — silent upsert on (exe, pattern) or a visible refusal — is
		 * still open, so this test pins today's behaviour instead of hiding it.
		 */
		it('emits one notice per rule when two rules declare the same target', async () => {
			const { timer, notifier, advance } = await createLoopHarness({
				rules: [makeRule({ id: 'rule-1' }), makeRule({ id: 'rule-2' })]
			});

			timer.start();
			await advance(10_000);

			expect(notifier.notifyCalls).toHaveLength(2);
		});
	});
});
