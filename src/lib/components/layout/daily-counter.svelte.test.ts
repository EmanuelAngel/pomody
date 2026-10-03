import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import DailyCounter from './daily-counter.svelte';
import { createTimerState } from '$lib/state/timer.svelte';
import { createDailyStatsState } from '$lib/state/daily-stats.svelte';

function createDummyTicker(isRunning = false) {
	return {
		isRunning,
		start: vi.fn(),
		stop: vi.fn(),
		destroy: vi.fn()
	};
}

describe('DailyCounter (Client Browser)', () => {
	it('renders default formatted summary text accurately (0 blocks · 0m)', async () => {
		const ticker = createDummyTicker(false);
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, ticker);
		const mockRepo = {
			loadStats: () => ({ date: '2026-10-03', completedBlocks: 0, accumulatedMinutes: 0 }),
			saveStats: vi.fn(),
			resetStats: vi.fn()
		};
		const dailyStatsState = createDailyStatsState(
			mockRepo,
			null,
			() => new Date('2026-10-03T12:00:00')
		);

		const screen = await render(DailyCounter, { timerState, dailyStatsState });
		const counter = screen.getByTestId('daily-focus-counter');

		await expect.element(counter).toBeVisible();
		await expect.element(counter).toHaveTextContent('0 blocks · 0m');
	});

	it('renders custom formatted summary text accurately for completed blocks and duration', async () => {
		const ticker = createDummyTicker(false);
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, ticker);
		const mockRepo = {
			loadStats: () => ({ date: '2026-10-03', completedBlocks: 4, accumulatedMinutes: 100 }),
			saveStats: vi.fn(),
			resetStats: vi.fn()
		};
		const dailyStatsState = createDailyStatsState(
			mockRepo,
			null,
			() => new Date('2026-10-03T12:00:00')
		);

		const screen = await render(DailyCounter, { timerState, dailyStatsState });
		const counter = screen.getByTestId('daily-focus-counter');

		await expect.element(counter).toBeVisible();
		await expect.element(counter).toHaveTextContent('4 blocks · 1h 40m');
	});

	it('has opacity-100 class when timerState.isRunning is false', async () => {
		const ticker = createDummyTicker(false);
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, ticker);

		const screen = await render(DailyCounter, { timerState });
		const counter = screen.getByTestId('daily-focus-counter');

		await expect.element(counter).toHaveClass('opacity-100');
		await expect.element(counter).not.toHaveClass('opacity-0');
	});

	it('has opacity-0 class when timerState.isRunning is true', async () => {
		const ticker = createDummyTicker(true);
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, ticker);
		timerState.start();

		const screen = await render(DailyCounter, { timerState });
		const counter = screen.getByTestId('daily-focus-counter');

		await expect.element(counter).toHaveClass('opacity-0');
		await expect.element(counter).not.toHaveClass('opacity-100');
	});

	it('has pointer-events-none, fixed bottom-5 inset-x-0 positioning and passive classes', async () => {
		const ticker = createDummyTicker(false);
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, ticker);

		const screen = await render(DailyCounter, { timerState });
		const counter = screen.getByTestId('daily-focus-counter');

		await expect.element(counter).toHaveClass('fixed');
		await expect.element(counter).toHaveClass('inset-x-0');
		await expect.element(counter).toHaveClass('bottom-5');
		await expect.element(counter).toHaveClass('z-20');
		await expect.element(counter).toHaveClass('pointer-events-none');
		await expect.element(counter).toHaveClass('select-none');
	});
});
