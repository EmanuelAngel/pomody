import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import MetricsView from './metrics-view.svelte';
import { InMemoryStorage } from '$lib/adapters/storage/in-memory-storage';
import { LocalDailyGoalRepository } from '$lib/adapters/storage/local-daily-goal-repository';
import { LocalFocusHistoryRepository } from '$lib/adapters/storage/local-focus-history-repository';
import { createDailyGoalState, type DailyGoalState } from '$lib/state/daily-goal.svelte';
import { createDailyStatsState } from '$lib/state/daily-stats.svelte';
import { createFocusHistoryState, type FocusHistoryState } from '$lib/state/focus-history.svelte';
import { createNavigationState } from '$lib/state/navigation.svelte';
import { localeState } from '$lib/state/locale.svelte';
import type { DailyGoalChange } from '$lib/domain/goals/daily-goal.entity';
import type { FocusHistoryEntry } from '$lib/domain/history/focus-history-entry.entity';

/** Local dates and hours: the day keys do not depend on the machine's time zone. */
const FRIDAY = new Date(2026, 9, 23, 12, 0, 0);
const SATURDAY = new Date(2026, 9, 24, 12, 0, 0);
const MONDAY_KEY = '2026-10-19';

const FOCUS_MS = 1_500_000;

function entryAt(
	day: number,
	overrides: Partial<FocusHistoryEntry> = {},
	hour = 10
): FocusHistoryEntry {
	const endedAt = new Date(2026, 9, day, hour, 0, 0);
	return {
		mode: 'focus',
		outcome: 'completed',
		plannedMs: FOCUS_MS,
		elapsedMs: FOCUS_MS,
		endedAt: endedAt.getTime(),
		utcOffsetMinutes: -endedAt.getTimezoneOffset(),
		...overrides
	};
}

/**
 * Week of Mon 19 to Sun 25 October 2026 (today: Friday 23):
 * Mon, Tue, Thu and Fri 3 blocks (75 min), Wed 2 blocks (50 min) = 14 blocks, 350 min.
 * One abandoned focus block on Friday: compliance 14 / 15. One block the week before.
 */
function sampleEntries(): FocusHistoryEntry[] {
	const blocksPerDay: Record<number, number> = { 19: 3, 20: 3, 21: 2, 22: 3, 23: 3 };
	const entries: FocusHistoryEntry[] = [entryAt(14)];
	for (const [day, blocks] of Object.entries(blocksPerDay)) {
		for (let index = 0; index < blocks; index += 1) {
			entries.push(entryAt(Number(day)));
		}
	}
	entries.push(entryAt(23, { outcome: 'abandoned', elapsedMs: 300_000 }));
	return entries;
}

async function createHarness(
	options: {
		goal?: Pick<DailyGoalChange, 'minutes' | 'restWeekdays'>;
		entries?: FocusHistoryEntry[];
		now?: Date;
	} = {}
) {
	const now = options.now ?? FRIDAY;

	const goalRepository = new LocalDailyGoalRepository(new InMemoryStorage());
	if (options.goal) {
		await goalRepository.applyChange({ effectiveFrom: MONDAY_KEY, ...options.goal });
	}
	const dailyGoalState = createDailyGoalState({
		repository: goalRepository,
		nowProvider: () => now
	});

	const historyRepository = new LocalFocusHistoryRepository(new InMemoryStorage(), () => now);
	for (const entry of options.entries ?? []) {
		await historyRepository.append(entry);
	}
	const focusHistoryState = createFocusHistoryState({
		repository: historyRepository,
		timer: { onEvent: () => () => {} },
		tasks: { activeTask: null },
		nowProvider: () => now
	});
	const dailyStatsState = createDailyStatsState(focusHistoryState, () => now);
	const navigationState = createNavigationState('metrics');

	await Promise.all([dailyGoalState.whenIdle(), focusHistoryState.whenIdle()]);

	return { dailyGoalState, focusHistoryState, dailyStatsState, navigationState };
}

describe('MetricsView (Client Browser)', () => {
	const goalStates: DailyGoalState[] = [];
	const historyStates: FocusHistoryState[] = [];

	async function renderView(options: Parameters<typeof createHarness>[0] = {}) {
		const harness = await createHarness(options);
		goalStates.push(harness.dailyGoalState);
		historyStates.push(harness.focusHistoryState);
		const screen = await render(MetricsView, harness);
		return { screen, ...harness };
	}

	afterEach(() => {
		for (const state of goalStates.splice(0)) {
			state.destroy();
		}
		for (const state of historyStates.splice(0)) {
			state.destroy();
		}
		localeState.setLocale('en');
		vi.restoreAllMocks();
	});

	describe('empty history', () => {
		it('shows only the empty state and no chart', async () => {
			const { screen } = await renderView();

			await expect
				.element(screen.getByText('Complete your first pomodoro to see your metrics'))
				.toBeVisible();
			expect(screen.container.querySelectorAll('svg[role="img"]')).toHaveLength(0);
			expect(screen.getByRole('button', { name: 'Set a goal' }).query()).toBeNull();
		});

		it('speaks Spanish when the locale changes', async () => {
			localeState.setLocale('es');
			const { screen } = await renderView();

			await expect
				.element(screen.getByText('Completa tu primer pomodoro para ver tus métricas'))
				.toBeVisible();
		});
	});

	describe('summary', () => {
		it('shows the focus total and the compliance of the selected week', async () => {
			const { screen } = await renderView({ entries: sampleEntries() });

			await expect.element(screen.getByText('5h 50m', { exact: true })).toBeVisible();
			await expect.element(screen.getByText('Completed blocks: 14')).toBeVisible();
			await expect.element(screen.getByText('93%', { exact: true })).toBeVisible();
			await expect.element(screen.getByText('14 of 15 focus blocks finished')).toBeVisible();
		});

		it('shows a dash for compliance when no focus block was started that week', async () => {
			const { screen } = await renderView({ entries: [entryAt(14)] });

			await expect.element(screen.getByText('No focus blocks started')).toBeVisible();
		});
	});

	describe('goal cards', () => {
		it('invites the user to set a goal and opens Settings on Metrics', async () => {
			const { screen, navigationState } = await renderView({ entries: sampleEntries() });

			await expect.element(screen.getByText('Set a daily goal')).toBeVisible();
			expect(screen.getByText('Today’s goal').query()).toBeNull();
			expect(screen.getByText('Streak', { exact: true }).query()).toBeNull();

			await screen.getByRole('button', { name: 'Set a goal' }).click();

			expect(navigationState.settingsRequest?.tab).toBe('metrics');
		});

		it('shows today’s progress in minutes and percent', async () => {
			const { screen } = await renderView({
				entries: sampleEntries(),
				goal: { minutes: 120, restWeekdays: [6, 7] }
			});

			await expect.element(screen.getByText('75 / 120 min · 62%')).toBeVisible();
			await expect.element(screen.getByText('0/4 days · 0%')).toBeVisible();
			await expect.element(screen.getByText('0 days', { exact: true })).toBeVisible();
			expect(screen.getByRole('button', { name: 'Set a goal' }).query()).toBeNull();
		});

		it('shows the week attainment and the streak', async () => {
			const { screen } = await renderView({
				entries: sampleEntries(),
				goal: { minutes: 60, restWeekdays: [6, 7] }
			});

			await expect.element(screen.getByText('4/5 days · 80%')).toBeVisible();
			await expect.element(screen.getByText('2 days', { exact: true })).toBeVisible();
		});

		it('says it is a rest day instead of showing progress', async () => {
			const { screen } = await renderView({
				entries: sampleEntries(),
				goal: { minutes: 60, restWeekdays: [6, 7] },
				now: SATURDAY
			});

			await expect.element(screen.getByText('Rest day', { exact: true })).toBeVisible();
			expect(screen.getByText(/\/ 60 min/).query()).toBeNull();
		});
	});

	describe('charts', () => {
		it('draws seven weekly bars and twenty-four hourly bars with today highlighted', async () => {
			const { screen } = await renderView({ entries: sampleEntries() });

			const weekly = screen.container.querySelectorAll('[data-chart-bar="weekly"]');
			expect(weekly).toHaveLength(7);
			expect(screen.container.querySelectorAll('[data-chart-bar="hourly"]')).toHaveLength(24);

			const today = screen.container.querySelectorAll(
				'[data-chart-bar="weekly"][data-today="true"]'
			);
			expect(today).toHaveLength(1);
			expect(weekly[4]).toBe(today[0]);
		});

		it('labels each chart as an image and mirrors its numbers in a text summary', async () => {
			const { screen } = await renderView({ entries: sampleEntries() });

			await expect
				.element(
					screen.getByRole('img', {
						name: 'Bar chart of completed focus time per day, Oct 19 – Oct 25'
					})
				)
				.toBeInTheDocument();
			await expect
				.element(
					screen.getByRole('img', {
						name: 'Bar chart of completed focus minutes by hour of the day, last 30 days'
					})
				)
				.toBeInTheDocument();

			await expect.element(screen.getByText('Mon: 1h 15m', { exact: true })).toBeInTheDocument();
			await expect.element(screen.getByText('Wed: 50m', { exact: true })).toBeInTheDocument();
			await expect.element(screen.getByText('Sat: 0m', { exact: true })).toBeInTheDocument();
			await expect.element(screen.getByText('10:00: 375 min', { exact: true })).toBeInTheDocument();
			await expect.element(screen.getByText('9:00: 0 min', { exact: true })).toBeInTheDocument();
		});

		it('shows the minutes of a day in a tooltip on hover', async () => {
			const { screen } = await renderView({ entries: sampleEntries() });

			const wednesday = screen.container.querySelectorAll('[data-chart-bar="weekly"]')[2];
			await page.elementLocator(wednesday).hover();

			await vi.waitFor(() =>
				expect(document.querySelector('[data-slot="tooltip-content"]')?.textContent).toContain(
					'Wed: 50m'
				)
			);
		});
	});

	describe('week navigation', () => {
		it('labels the range and disables Next on the current week', async () => {
			const { screen } = await renderView({ entries: sampleEntries() });

			await expect.element(screen.getByText('Oct 19 – Oct 25', { exact: true })).toBeVisible();
			await expect.element(screen.getByRole('button', { name: 'Next week' })).toBeDisabled();
			await expect.element(screen.getByRole('button', { name: 'Previous week' })).toBeEnabled();
		});

		it('moves to the previous week and back', async () => {
			const { screen } = await renderView({ entries: sampleEntries() });

			await screen.getByRole('button', { name: 'Previous week' }).click();

			await expect.element(screen.getByText('Oct 12 – Oct 18', { exact: true })).toBeVisible();
			await expect.element(screen.getByText('25m', { exact: true })).toBeVisible();
			await expect.element(screen.getByRole('button', { name: 'Next week' })).toBeEnabled();
			expect(
				screen.container.querySelectorAll('[data-chart-bar="weekly"][data-today="true"]')
			).toHaveLength(0);

			await screen.getByRole('button', { name: 'Next week' }).click();

			await expect.element(screen.getByText('Oct 19 – Oct 25', { exact: true })).toBeVisible();
			await expect.element(screen.getByRole('button', { name: 'Next week' })).toBeDisabled();
		});
	});
});
