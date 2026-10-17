import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import DistractionView from './distraction-view.svelte';
import { createDistractionState } from '$lib/state/distractionState.svelte';
import type { DistractionRule } from '$lib/domain/distraction/distraction-rule.entity';
import { FakeDistractionMonitor } from '$tests/fakes/platform/fake-distraction-monitor';
import { FakeDistractionRuleRepository } from '$tests/fakes/repositories/fake-distraction-rule-repository';
import { FakeDistractionWhitelistRepository } from '$tests/fakes/repositories/fake-distraction-whitelist-repository';
import { FakeSettingsStorage } from '$tests/fakes/repositories/fake-settings-storage';

const NOW = new Date(2026, 9, 16, 10, 0, 0);
const TODAY_KEY = '2026-10-16';
const WINDOWS = [
	{ exe: 'chrome', title: 'YouTube — Google Chrome' },
	{ exe: 'steam', title: 'Steam' }
];

function makeRule(overrides: Partial<DistractionRule> = {}): DistractionRule {
	return { id: 'rule-1', exe: 'chrome', createdAt: NOW.getTime() - 1000, ...overrides };
}

async function createHarness(
	options: {
		rules?: readonly DistractionRule[];
		silencedRuleIds?: readonly string[];
		windows?: readonly { exe: string; title: string }[];
	} = {}
) {
	const ruleRepository = new FakeDistractionRuleRepository(options.rules);
	const whitelistRepository = new FakeDistractionWhitelistRepository(
		options.silencedRuleIds !== undefined
			? { silencedUntil: TODAY_KEY, ruleIds: options.silencedRuleIds }
			: undefined
	);
	const settingsStorage = new FakeSettingsStorage();
	const monitor = new FakeDistractionMonitor({ windows: options.windows ?? WINDOWS });

	const state = createDistractionState({
		ruleRepository,
		whitelistRepository,
		settingsStorage,
		monitor,
		now: () => NOW
	});

	await state.load();

	const screen = await render(DistractionView, {
		distractionState: state,
		portalProps: { disabled: true }
	});

	return { screen, state, ruleRepository, whitelistRepository };
}

describe('DistractionView (Client Browser)', () => {
	it('explains the feature and keeps the declaration form usable when nothing is declared', async () => {
		const { screen } = await createHarness();

		await expect.element(screen.getByText('No declared distractions')).toBeVisible();
		await expect.element(screen.getByText(/The detector ships off/)).toBeVisible();

		expect(
			screen.container.querySelector('[aria-labelledby="distraction-rules-heading"]')
		).toBeNull();
		await expect.element(screen.getByLabelText('Executable')).toBeVisible();
	});

	it('declares a rule from the picker and lists it with its pattern', async () => {
		const { screen, ruleRepository } = await createHarness();

		await screen.getByRole('button', { name: 'Open windows' }).click();
		await screen.getByRole('option', { name: 'YouTube — Google Chrome' }).click();
		await screen.getByRole('button', { name: 'Add rule' }).click();

		await expect.element(screen.getByRole('list', { name: 'Declared rules' })).toBeInTheDocument();
		const rules = screen
			.getByRole('list', { name: 'Declared rules' })
			.element()
			.querySelectorAll('li');
		expect(rules).toHaveLength(1);
		expect(rules[0].textContent).toContain('chrome');
		expect(rules[0].textContent).toContain('YouTube — Google Chrome');
		expect(ruleRepository.saveCalls).toHaveLength(1);
		expect(ruleRepository.saveCalls[0].exe).toBe('chrome');
		expect(ruleRepository.saveCalls[0].titlePattern).toBe('YouTube — Google Chrome');
		await expect.element(screen.getByText('No declared distractions')).not.toBeInTheDocument();
	});

	it('edits a declared rule in place', async () => {
		const rule = makeRule({ titlePattern: 'YouTube' });
		const { screen, ruleRepository } = await createHarness({ rules: [rule] });

		await screen.getByRole('button', { name: 'Edit the chrome rule' }).click();

		const pattern = screen.getByLabelText('Title pattern');
		await expect.element(pattern).toHaveValue('YouTube');
		await userEvent.clear(pattern);
		await userEvent.type(pattern, 'Reddit');
		await screen.getByRole('button', { name: 'Save changes' }).click();

		const rules = screen
			.getByRole('list', { name: 'Declared rules' })
			.element()
			.querySelectorAll('li');
		expect(rules).toHaveLength(1);
		expect(rules[0].textContent).toContain('Reddit');
		expect(ruleRepository.saveCalls).toHaveLength(1);
		expect(ruleRepository.saveCalls[0].id).toBe(rule.id);
		expect(ruleRepository.saveCalls[0].createdAt).toBe(rule.createdAt);
	});

	it('deletes a declared rule only after the confirmation', async () => {
		const rule = makeRule();
		const { screen, ruleRepository } = await createHarness({ rules: [rule] });

		await screen.getByRole('button', { name: 'Delete the chrome rule' }).click();
		await expect.element(screen.getByText('Delete this rule?')).toBeInTheDocument();
		await screen.getByRole('button', { name: 'Confirm' }).click();

		await expect.element(screen.getByText('No declared distractions')).toBeVisible();
		expect(ruleRepository.deleteCalls).toEqual([rule.id]);
	});

	it('lists the rules silenced today and releases one', async () => {
		const rule = makeRule();
		const { screen, whitelistRepository } = await createHarness({
			rules: [rule],
			silencedRuleIds: [rule.id]
		});

		await expect.element(screen.getByText('Silenced today')).toBeVisible();
		await screen.getByRole('button', { name: 'Release the silence for chrome' }).click();

		expect(whitelistRepository.unsilenceCalls).toEqual([{ ruleId: rule.id, dateKey: TODAY_KEY }]);
		await expect.element(screen.getByText('Silenced today')).not.toBeInTheDocument();
	});

	it('hides the silenced section when nothing is silenced today', async () => {
		const rule = makeRule();
		const { screen } = await createHarness({ rules: [rule] });

		await expect.element(screen.getByText('Silenced today')).not.toBeInTheDocument();
		await expect.element(screen.getByText('Declared rules')).toBeVisible();
	});
});
