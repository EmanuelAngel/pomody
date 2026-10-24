import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import DailyCounter from './daily-counter.svelte';
import { createTimerState } from '$lib/state/timer.svelte';
import type { DomainEvent } from '$lib/domain/events/block-completed.event';
import { createDailyStatsState } from '$lib/state/daily-stats.svelte';
import { createFocusHistoryState } from '$lib/state/focus-history.svelte';
import { InMemoryStorage } from '$lib/adapters/storage/in-memory-storage';
import { LocalFocusHistoryRepository } from '$lib/adapters/storage/local-focus-history-repository';

function createDummyTicker(isRunning = false) {
	return {
		isRunning,
		start: vi.fn(),
		stop: vi.fn(),
		destroy: vi.fn()
	};
}

const TODAY = new Date(2026, 9, 3, 12, 0, 0);
const idleTimer = { onEvent: () => () => {} };

/** A counter over a history holding `blocks` completed focus blocks that add up to `minutes`. */
async function createCounterWith(blocks: number, minutes: number) {
	const repository = new LocalFocusHistoryRepository(new InMemoryStorage(), () => TODAY);
	for (let index = 0; index < blocks; index += 1) {
		const plannedMs = (minutes / blocks) * 60_000;
		await repository.append({
			mode: 'focus',
			outcome: 'completed',
			plannedMs,
			elapsedMs: plannedMs,
			endedAt: TODAY.getTime(),
			utcOffsetMinutes: 0 - TODAY.getTimezoneOffset()
		});
	}
	const history = createFocusHistoryState({
		repository,
		timer: idleTimer,
		tasks: { activeTask: null },
		nowProvider: () => TODAY
	});
	await history.whenIdle();
	return createDailyStatsState(history, () => TODAY);
}

describe('DailyCounter (Client Browser)', () => {
	it('renders default formatted summary text accurately (0 blocks · 0m)', async () => {
		const ticker = createDummyTicker(false);
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, ticker);
		const dailyStatsState = await createCounterWith(0, 0);

		const screen = await render(DailyCounter, { timerState, dailyStatsState });
		const counter = screen.getByTestId('daily-focus-counter');

		await expect.element(counter).toBeVisible();
		await expect.element(counter).toHaveTextContent('0 blocks · 0m');
	});

	it('renders custom formatted summary text accurately for completed blocks and duration', async () => {
		const ticker = createDummyTicker(false);
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, ticker);
		const dailyStatsState = await createCounterWith(4, 100);

		const screen = await render(DailyCounter, { timerState, dailyStatsState });
		const counter = screen.getByTestId('daily-focus-counter');

		await expect.element(counter).toBeVisible();
		await expect.element(counter).toHaveTextContent('4 blocks · 1h 40m');
	});

	it('switches formatted summary reactively on locale changes', async () => {
		const ticker = createDummyTicker(false);
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, ticker);
		const dailyStatsState = await createCounterWith(4, 100);

		const screen = await render(DailyCounter, { timerState, dailyStatsState });
		const counter = screen.getByTestId('daily-focus-counter');

		await expect.element(counter).toHaveTextContent('4 blocks · 1h 40m');

		const { localeState } = await import('$lib/state/locale.svelte');
		localeState.setLocale('es');

		await expect.element(counter).toHaveTextContent('4 bloques · 1h 40m');

		localeState.setLocale('en');

		await expect.element(counter).toHaveTextContent('4 blocks · 1h 40m');
	});

	it('has opacity-100 class and no aria-hidden when timerState.isRunning is false', async () => {
		const ticker = createDummyTicker(false);
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, ticker);

		const screen = await render(DailyCounter, { timerState });
		const counter = screen.getByTestId('daily-focus-counter');

		await expect.element(counter).toHaveClass('opacity-100');
		await expect.element(counter).not.toHaveClass('opacity-0');
		await expect.element(counter).not.toHaveAttribute('aria-hidden');
	});

	it('has opacity-0 class and aria-hidden="true" when timerState.isRunning is true', async () => {
		const ticker = createDummyTicker(true);
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, ticker);
		timerState.start();

		const screen = await render(DailyCounter, { timerState });
		const counter = screen.getByTestId('daily-focus-counter');

		await expect.element(counter).toHaveClass('opacity-0');
		await expect.element(counter).not.toHaveClass('opacity-100');
		await expect.element(counter).toHaveAttribute('aria-hidden', 'true');
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

	it('adds a readable backdrop to the summary while an illustration is visible', async () => {
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, createDummyTicker(false));

		const screen = await render(DailyCounter, { timerState, illustration: { isVisible: true } });
		const summary = screen.getByTestId('daily-focus-counter').element().querySelector('span');

		expect(summary?.classList.contains('md:backdrop-blur-sm')).toBe(true);
		expect(summary?.classList.contains('md:bg-bg-surface/80')).toBe(true);
	});

	it('keeps the bare summary when no illustration is visible', async () => {
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, createDummyTicker(false));

		const screen = await render(DailyCounter, { timerState, illustration: { isVisible: false } });
		const summary = screen.getByTestId('daily-focus-counter').element().querySelector('span');

		expect(summary?.classList.contains('md:backdrop-blur-sm')).toBe(false);
		expect(summary?.classList.contains('text-muted-foreground/60')).toBe(true);
	});

	it('updates by itself when a block is recorded and when the history is cleared', async () => {
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, createDummyTicker(false));
		let emit: (event: DomainEvent) => void = () => {};
		const history = createFocusHistoryState({
			repository: new LocalFocusHistoryRepository(new InMemoryStorage(), () => TODAY),
			timer: {
				onEvent: (fn) => {
					emit = fn;
					return () => {};
				}
			},
			tasks: { activeTask: null },
			nowProvider: () => TODAY
		});
		const dailyStatsState = createDailyStatsState(history, () => TODAY);
		const screen = await render(DailyCounter, { timerState, dailyStatsState });
		const counter = screen.getByTestId('daily-focus-counter');
		await expect.element(counter).toHaveTextContent('0 blocks · 0m');

		emit({
			type: 'block-completed',
			mode: 'focus',
			round: 1,
			totalRoundsCompleted: 1,
			durationMs: 1_500_000,
			elapsedMs: 1_500_000,
			completedAt: TODAY
		});
		await expect.element(counter).toHaveTextContent('1 block · 25m');

		await history.clear();
		await expect.element(counter).toHaveTextContent('0 blocks · 0m');
		history.destroy();
	});
});
