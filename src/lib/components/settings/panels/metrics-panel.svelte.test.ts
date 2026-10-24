import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import MetricsPanel from './metrics-panel.svelte';
import * as m from '$lib/paraglide/messages';
import { InMemoryStorage } from '$lib/adapters/storage/in-memory-storage';
import { LocalDailyGoalRepository } from '$lib/adapters/storage/local-daily-goal-repository';
import { LocalFocusHistoryRepository } from '$lib/adapters/storage/local-focus-history-repository';
import { createDailyGoalState, type DailyGoalState } from '$lib/state/daily-goal.svelte';
import { createDailyStatsState } from '$lib/state/daily-stats.svelte';
import { createFocusHistoryState } from '$lib/state/focus-history.svelte';
import type { DailyGoalChange } from '$lib/domain/goals/daily-goal.entity';
import type { FocusHistoryEntry } from '$lib/domain/history/focus-history-entry.entity';

/** Local noon: the local date key does not depend on the machine's time zone. */
const NOW = new Date(2026, 9, 23, 12, 0, 0);
const TODAY_KEY = '2026-10-23';

function focusEntry(minutesAgo: number): FocusHistoryEntry {
	return {
		mode: 'focus',
		outcome: 'completed',
		plannedMs: 1_500_000,
		elapsedMs: 1_500_000,
		endedAt: NOW.getTime() - minutesAgo * 60_000,
		utcOffsetMinutes: -NOW.getTimezoneOffset()
	};
}

async function createHarness(options: { goal?: DailyGoalChange; entries?: number } = {}) {
	const goalRepository = new LocalDailyGoalRepository(new InMemoryStorage());
	if (options.goal) {
		await goalRepository.applyChange(options.goal);
	}
	const dailyGoalState = createDailyGoalState({
		repository: goalRepository,
		nowProvider: () => NOW
	});

	const historyRepository = new LocalFocusHistoryRepository(new InMemoryStorage(), () => NOW);
	for (let index = 0; index < (options.entries ?? 0); index += 1) {
		await historyRepository.append(focusEntry(index + 1));
	}
	const focusHistoryState = createFocusHistoryState({
		repository: historyRepository,
		timer: { onEvent: () => () => {} },
		tasks: { activeTask: null },
		nowProvider: () => NOW
	});
	const dailyStatsState = createDailyStatsState(focusHistoryState, () => NOW);

	await Promise.all([dailyGoalState.whenIdle(), focusHistoryState.whenIdle()]);

	return { dailyGoalState, focusHistoryState, dailyStatsState, goalRepository, historyRepository };
}

function goal(overrides: Partial<DailyGoalChange> = {}): DailyGoalChange {
	return { effectiveFrom: TODAY_KEY, minutes: 120, restWeekdays: [6, 7], ...overrides };
}

async function commitGoal(
	screen: Awaited<ReturnType<typeof render>>,
	value: string
): Promise<void> {
	const input = screen.getByRole('spinbutton', { name: m.settings_metrics_goal_aria() });
	await input.fill(value);
	await userEvent.tab();
}

describe('MetricsPanel (Client Browser)', () => {
	const states: DailyGoalState[] = [];

	afterEach(() => {
		for (const state of states.splice(0)) {
			state.destroy();
		}
		vi.restoreAllMocks();
	});

	describe('daily goal', () => {
		it('renders the current goal in minutes', async () => {
			const harness = await createHarness({ goal: goal({ minutes: 90 }) });
			states.push(harness.dailyGoalState);

			const screen = await render(MetricsPanel, harness);
			const input = screen.getByRole('spinbutton', { name: m.settings_metrics_goal_aria() });

			await expect.element(input).toHaveValue(90);
		});

		it('renders an empty field and disabled rest days when there is no goal', async () => {
			const harness = await createHarness();
			states.push(harness.dailyGoalState);

			const screen = await render(MetricsPanel, harness);

			await expect
				.element(screen.getByRole('spinbutton', { name: m.settings_metrics_goal_aria() }))
				.toHaveValue(null);
			await expect
				.element(screen.getByRole('button', { name: m.settings_metrics_weekday_6_long() }))
				.toBeDisabled();
			await expect.element(screen.getByText(m.settings_metrics_rest_needs_goal())).toBeVisible();
		});

		it('applies the edited goal from today', async () => {
			const harness = await createHarness({ goal: goal({ minutes: 90 }) });
			states.push(harness.dailyGoalState);

			const screen = await render(MetricsPanel, harness);
			await commitGoal(screen, '150');

			await vi.waitFor(() => expect(harness.dailyGoalState.currentGoal?.minutes).toBe(150));
			expect(harness.dailyGoalState.currentGoal?.restWeekdays).toEqual([6, 7]);
			expect(harness.dailyGoalState.history).toHaveLength(1);
		});

		it('sets a first goal with no rest days', async () => {
			const harness = await createHarness();
			states.push(harness.dailyGoalState);

			const screen = await render(MetricsPanel, harness);
			await commitGoal(screen, '60');

			await vi.waitFor(() =>
				expect(harness.dailyGoalState.currentGoal).toEqual({
					effectiveFrom: TODAY_KEY,
					minutes: 60,
					restWeekdays: []
				})
			);
		});

		it('turns the goal off when 0 is committed', async () => {
			const harness = await createHarness({ goal: goal() });
			states.push(harness.dailyGoalState);

			const screen = await render(MetricsPanel, harness);
			await commitGoal(screen, '0');

			await vi.waitFor(() => expect(harness.dailyGoalState.currentGoal).toBeNull());
		});

		it('does not create a removal when there was no goal and 0 is committed', async () => {
			const harness = await createHarness();
			states.push(harness.dailyGoalState);

			const screen = await render(MetricsPanel, harness);
			await commitGoal(screen, '0');

			expect(harness.dailyGoalState.history).toEqual([]);
		});

		it('rejects an out-of-range value, explains it and keeps the goal', async () => {
			const harness = await createHarness({ goal: goal({ minutes: 90 }) });
			states.push(harness.dailyGoalState);

			const screen = await render(MetricsPanel, harness);
			await commitGoal(screen, '5000');

			await expect
				.element(screen.getByText(m.settings_metrics_goal_invalid({ max: 1440 })))
				.toBeVisible();
			expect(harness.dailyGoalState.currentGoal?.minutes).toBe(90);
			await expect
				.element(screen.getByRole('spinbutton', { name: m.settings_metrics_goal_aria() }))
				.toHaveAttribute('aria-invalid', 'true');
		});

		it('rejects a fractional value and keeps the goal', async () => {
			const harness = await createHarness({ goal: goal({ minutes: 90 }) });
			states.push(harness.dailyGoalState);

			const screen = await render(MetricsPanel, harness);
			await commitGoal(screen, '45.5');

			expect(harness.dailyGoalState.currentGoal?.minutes).toBe(90);
			await expect
				.element(screen.getByText(m.settings_metrics_goal_invalid({ max: 1440 })))
				.toBeVisible();
		});
	});

	describe('rest days', () => {
		it('shows the stored rest days as pressed, Monday first', async () => {
			const harness = await createHarness({ goal: goal({ restWeekdays: [6, 7] }) });
			states.push(harness.dailyGoalState);

			const screen = await render(MetricsPanel, harness);

			await expect
				.element(screen.getByRole('button', { name: m.settings_metrics_weekday_6_long() }))
				.toHaveAttribute('aria-pressed', 'true');
			await expect
				.element(screen.getByRole('button', { name: m.settings_metrics_weekday_1_long() }))
				.toHaveAttribute('aria-pressed', 'false');

			const labels = screen
				.getByRole('group', { name: m.settings_metrics_rest_aria() })
				.getByRole('button')
				.elements()
				.map((element) => element.textContent?.trim());
			expect(labels).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
		});

		it('toggles a rest day and applies it from today', async () => {
			const harness = await createHarness({ goal: goal({ restWeekdays: [7] }) });
			states.push(harness.dailyGoalState);

			const screen = await render(MetricsPanel, harness);
			await screen.getByRole('button', { name: m.settings_metrics_weekday_6_long() }).click();

			await vi.waitFor(() =>
				expect(harness.dailyGoalState.currentGoal?.restWeekdays).toEqual([6, 7])
			);
			expect(harness.dailyGoalState.currentGoal?.minutes).toBe(120);

			await screen.getByRole('button', { name: m.settings_metrics_weekday_7_long() }).click();

			await vi.waitFor(() => expect(harness.dailyGoalState.currentGoal?.restWeekdays).toEqual([6]));
		});

		it('refuses to make the seventh day a rest day', async () => {
			const harness = await createHarness({ goal: goal({ restWeekdays: [1, 2, 3, 4, 5, 6] }) });
			states.push(harness.dailyGoalState);

			const screen = await render(MetricsPanel, harness);
			const sunday = screen.getByRole('button', { name: m.settings_metrics_weekday_7_long() });
			await sunday.click();

			expect(harness.dailyGoalState.currentGoal?.restWeekdays).toEqual([1, 2, 3, 4, 5, 6]);
			await expect.element(sunday).toHaveAttribute('aria-pressed', 'false');
		});
	});

	describe('delete history', () => {
		it('opens a confirmation without deleting anything yet', async () => {
			const harness = await createHarness({ goal: goal(), entries: 2 });
			states.push(harness.dailyGoalState);

			const screen = await render(MetricsPanel, harness);
			await screen.getByRole('button', { name: m.settings_metrics_delete_history() }).click();

			const dialog = screen.getByRole('alertdialog');
			await expect.element(dialog).toBeVisible();
			await expect.element(dialog.getByText(m.settings_metrics_delete_title())).toBeVisible();
			await expect.element(dialog.getByText(m.settings_metrics_delete_description())).toBeVisible();
			expect(harness.focusHistoryState.entries).toHaveLength(2);
		});

		it('keeps the history when the user cancels', async () => {
			const harness = await createHarness({ goal: goal(), entries: 2 });
			states.push(harness.dailyGoalState);

			const screen = await render(MetricsPanel, harness);
			await screen.getByRole('button', { name: m.settings_metrics_delete_history() }).click();
			await screen
				.getByRole('alertdialog')
				.getByRole('button', { name: m.settings_metrics_delete_cancel() })
				.click();

			await expect.element(screen.getByRole('alertdialog')).not.toBeInTheDocument();
			expect(harness.focusHistoryState.entries).toHaveLength(2);
			expect(harness.dailyStatsState.completedBlocks).toBe(2);
			expect(await harness.historyRepository.getAll()).toHaveLength(2);
		});

		it('clears the history on confirm, resets the counter source and keeps the goal', async () => {
			const harness = await createHarness({ goal: goal({ minutes: 90 }), entries: 3 });
			states.push(harness.dailyGoalState);
			expect(harness.dailyStatsState.completedBlocks).toBe(3);

			const screen = await render(MetricsPanel, harness);
			await screen.getByRole('button', { name: m.settings_metrics_delete_history() }).click();
			await screen
				.getByRole('alertdialog')
				.getByRole('button', { name: m.settings_metrics_delete_confirm() })
				.click();

			await vi.waitFor(() => expect(harness.focusHistoryState.entries).toHaveLength(0));
			expect(harness.dailyStatsState.completedBlocks).toBe(0);
			expect(await harness.historyRepository.getAll()).toEqual([]);

			expect(harness.dailyGoalState.currentGoal).toEqual(goal({ minutes: 90 }));
			expect(await harness.goalRepository.getHistory()).toEqual([goal({ minutes: 90 })]);
			await expect
				.element(screen.getByRole('spinbutton', { name: m.settings_metrics_goal_aria() }))
				.toHaveValue(90);
		});
	});
});
