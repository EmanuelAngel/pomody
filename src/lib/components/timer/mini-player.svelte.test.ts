import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import MiniPlayer from './mini-player.svelte';
// The widget's rest/hover reveal is expressed with Tailwind visibility utilities.
// In isolation nothing pulls `app.css` in (only `+layout.svelte` does), so without this
// import `invisible` is a no-op and every element would read as visible.
import '../../../app.css';
import { createTimerState } from '$lib/state/timer.svelte';
import { createTasksState } from '$lib/state/tasks.svelte';
import { createWindowState } from '$lib/state/windowState.svelte';
import { createFocusTask } from '$lib/domain/tasks/task.entity';
import { FakeTicker } from '$tests/fakes/engine/fake-ticker';
import { FakeAudioNotifier } from '$tests/fakes/engine/fake-audio-notifier';
import { FakeTaskRepository } from '$tests/fakes/repositories/fake-task-repository';
import { FakeWindowShell } from '$tests/fakes/platform/fake-window-shell';

const REGION_NAME = 'Mini timer';

function createTestTimer() {
	const ticker = new FakeTicker();
	const audio = new FakeAudioNotifier();
	const timerState = createTimerState({ focusDurationSeconds: 1500 }, ticker, audio);
	return { timerState, ticker, audio };
}

async function createEmptyTasksState() {
	const tasksState = createTasksState(new FakeTaskRepository());
	await tasksState.load();
	return tasksState;
}

function createMiniWindowState() {
	const shell = new FakeWindowShell();
	const windowState = createWindowState(shell);
	windowState.isMiniPlayer = true;
	windowState.isAlwaysOnTop = true;
	return { windowState, shell };
}

describe('MiniPlayer rest state', () => {
	it('shows only the play control while the secondary actions stay hidden', async () => {
		const { timerState } = createTestTimer();
		const tasksState = await createEmptyTasksState();
		const { windowState } = createMiniWindowState();

		const screen = await render(MiniPlayer, { timerState, tasksState, windowState });

		await expect
			.element(screen.getByRole('button', { name: 'Start timer', includeHidden: true }))
			.toBeVisible();

		await expect
			.element(screen.getByRole('button', { name: 'Reset timer', includeHidden: true }))
			.not.toBeVisible();

		await expect
			.element(screen.getByRole('button', { name: 'Skip to next session', includeHidden: true }))
			.not.toBeVisible();

		await expect
			.element(screen.getByRole('button', { name: 'Restore window', includeHidden: true }))
			.not.toBeVisible();
	});

	it('exposes the widget as a named landmark region', async () => {
		const { timerState } = createTestTimer();
		const tasksState = await createEmptyTasksState();
		const { windowState } = createMiniWindowState();

		const screen = await render(MiniPlayer, { timerState, tasksState, windowState });

		await expect.element(screen.getByRole('region', { name: REGION_NAME })).toBeVisible();
	});

	it('renders the formatted MM:SS time centered as tabular digits', async () => {
		const { timerState } = createTestTimer();
		const tasksState = await createEmptyTasksState();
		const { windowState } = createMiniWindowState();

		const screen = await render(MiniPlayer, { timerState, tasksState, windowState });

		await expect.element(screen.getByText('25:00', { exact: true })).toBeVisible();
	});
});

describe('MiniPlayer hover reveal', () => {
	it('reveals reset, skip and restore on hover and hides them again on leave', async () => {
		const { timerState } = createTestTimer();
		const tasksState = await createEmptyTasksState();
		const { windowState } = createMiniWindowState();

		const screen = await render(MiniPlayer, { timerState, tasksState, windowState });

		const region = screen.getByRole('region', { name: REGION_NAME });
		const reset = screen.getByRole('button', { name: 'Reset timer', includeHidden: true });
		const skip = screen.getByRole('button', { name: 'Skip to next session', includeHidden: true });
		const restore = screen.getByRole('button', { name: 'Restore window', includeHidden: true });

		await userEvent.hover(region);
		await expect.element(reset).toBeVisible();
		await expect.element(skip).toBeVisible();
		await expect.element(restore).toBeVisible();

		await userEvent.unhover(region);
		await expect.element(reset).not.toBeVisible();
		await expect.element(skip).not.toBeVisible();
		await expect.element(restore).not.toBeVisible();
	});

	it('keeps the play control visible and stationary across hover', async () => {
		const { timerState } = createTestTimer();
		const tasksState = await createEmptyTasksState();
		const { windowState } = createMiniWindowState();

		const screen = await render(MiniPlayer, { timerState, tasksState, windowState });

		const region = screen.getByRole('region', { name: REGION_NAME });
		const play = screen.getByRole('button', { name: 'Start timer', includeHidden: true });

		await expect.element(play).toBeVisible();
		const before = play.element().getBoundingClientRect().right;

		await userEvent.hover(region);
		await expect.element(play).toBeVisible();

		expect(play.element().getBoundingClientRect().right).toBe(before);
	});
});

describe('MiniPlayer play/pause composition', () => {
	it('pauses a running timer when the play control is clicked', async () => {
		const { timerState, ticker } = createTestTimer();
		const tasksState = await createEmptyTasksState();
		const { windowState } = createMiniWindowState();

		timerState.start();
		expect(timerState.isRunning).toBe(true);

		const screen = await render(MiniPlayer, { timerState, tasksState, windowState });

		await screen.getByRole('button', { name: 'Pause timer' }).click();

		await expect.poll(() => timerState.isRunning).toBe(false);
		// `pause()` stops the ticker directly and again through the FSM subscription.
		expect(ticker.stopCallCount).toBeGreaterThanOrEqual(1);
		expect(ticker.isRunning).toBe(false);
	});

	it('starts an idle timer when the play control is clicked', async () => {
		const { timerState, ticker } = createTestTimer();
		const tasksState = await createEmptyTasksState();
		const { windowState } = createMiniWindowState();

		const screen = await render(MiniPlayer, { timerState, tasksState, windowState });

		await screen.getByRole('button', { name: 'Start timer' }).click();

		await expect.poll(() => timerState.isRunning).toBe(true);
		expect(ticker.startCallCount).toBe(1);
	});

	it('resumes a paused timer when the play control is clicked', async () => {
		const { timerState } = createTestTimer();
		const tasksState = await createEmptyTasksState();
		const { windowState } = createMiniWindowState();

		timerState.start();
		timerState.pause();
		expect(timerState.state).toBe('paused');

		const screen = await render(MiniPlayer, { timerState, tasksState, windowState });

		await screen.getByRole('button', { name: 'Resume timer' }).click();

		await expect.poll(() => timerState.isRunning).toBe(true);
	});

	it('resets and skips the current block from the revealed secondary actions', async () => {
		const { timerState, ticker } = createTestTimer();
		const tasksState = await createEmptyTasksState();
		const { windowState } = createMiniWindowState();

		const screen = await render(MiniPlayer, { timerState, tasksState, windowState });

		await userEvent.hover(screen.getByRole('region', { name: REGION_NAME }));
		await screen.getByRole('button', { name: 'Reset timer' }).click();
		await expect.poll(() => ticker.stopCallCount).toBeGreaterThanOrEqual(1);

		await screen.getByRole('button', { name: 'Skip to next session' }).click();
		await expect.poll(() => timerState.mode).toBe('shortBreak');
	});
});

describe('MiniPlayer restore action', () => {
	it('restores the main window through the injected window state', async () => {
		const { timerState } = createTestTimer();
		const tasksState = await createEmptyTasksState();
		const { windowState, shell } = createMiniWindowState();

		const screen = await render(MiniPlayer, { timerState, tasksState, windowState });

		await userEvent.hover(screen.getByRole('region', { name: REGION_NAME }));
		await screen.getByRole('button', { name: 'Restore window' }).click();

		await expect.poll(() => shell.restoreMainWindowCallCount).toBe(1);
		expect(windowState.isMiniPlayer).toBe(false);
		expect(shell.isMini).toBe(false);
	});
});

describe('MiniPlayer active task label', () => {
	it('renders the active task title when one is pinned', async () => {
		const task = createFocusTask({ title: 'Write the mini player tests' });
		const repo = new FakeTaskRepository([task]);
		const tasksState = createTasksState(repo);
		await tasksState.load();
		tasksState.setActiveTask(task.id);

		const { timerState } = createTestTimer();
		const { windowState } = createMiniWindowState();

		const screen = await render(MiniPlayer, { timerState, tasksState, windowState });

		await expect.element(screen.getByText('Write the mini player tests')).toBeVisible();
	});

	it('falls back to the free focus label when no task is pinned', async () => {
		const { timerState } = createTestTimer();
		const tasksState = await createEmptyTasksState();
		const { windowState } = createMiniWindowState();

		const screen = await render(MiniPlayer, { timerState, tasksState, windowState });

		await expect.element(screen.getByText('Free focus')).toBeVisible();
	});
});

describe('MiniPlayer mode presentation', () => {
	it('swaps the accent color and the progress bar color with the timer mode', async () => {
		const { timerState } = createTestTimer();
		const tasksState = await createEmptyTasksState();
		const { windowState } = createMiniWindowState();

		const screen = await render(MiniPlayer, { timerState, tasksState, windowState });
		const root = screen.getByRole('region', { name: REGION_NAME });

		await expect.element(root).toHaveAttribute('data-mode', 'focus');
		const icon = root.element().querySelector('[data-slot="mini-player-mode-icon"]');
		expect(icon?.getAttribute('class')).toContain('bg-accent-foam/10');
		expect(icon?.getAttribute('class')).toContain('text-accent-foam');

		timerState.skip();

		await expect.element(root).toHaveAttribute('data-mode', 'shortBreak');
		expect(icon?.getAttribute('class')).toContain('bg-accent-pine/10');
		expect(icon?.getAttribute('class')).toContain('text-accent-pine');

		const progress = root.element().querySelector('[data-slot="mini-player-progress"]');
		expect(progress?.getAttribute('class')).toContain('bg-accent-pine');
	});
});

describe('MiniPlayer drag region isolation', () => {
	it('never marks the button row or any of its buttons as a drag region', async () => {
		const { timerState } = createTestTimer();
		const tasksState = await createEmptyTasksState();
		const { windowState } = createMiniWindowState();

		const screen = await render(MiniPlayer, { timerState, tasksState, windowState });
		const root = screen.getByRole('region', { name: REGION_NAME });

		await userEvent.hover(root);

		const controls = root.element().querySelector('[data-slot="mini-player-controls"]');
		expect(controls).not.toBeNull();
		expect(controls?.hasAttribute('data-tauri-drag-region')).toBe(false);
		expect(controls?.querySelectorAll('[data-tauri-drag-region]').length).toBe(0);
	});

	it('marks the identifier and time columns as drag regions', async () => {
		const { timerState } = createTestTimer();
		const tasksState = await createEmptyTasksState();
		const { windowState } = createMiniWindowState();

		const screen = await render(MiniPlayer, { timerState, tasksState, windowState });
		const root = screen.getByRole('region', { name: REGION_NAME });

		expect(root.element().querySelectorAll('[data-tauri-drag-region]').length).toBeGreaterThan(0);
		expect(
			root.element().querySelector('[data-slot="mini-player-controls"]')?.getAttribute('class')
		).toBeDefined();
	});
});

describe('MiniPlayer progress bar', () => {
	it('renders the 0..1 progress value as a percentage width without a numeric label', async () => {
		const { timerState, ticker } = createTestTimer();
		const tasksState = await createEmptyTasksState();
		const { windowState } = createMiniWindowState();

		const screen = await render(MiniPlayer, { timerState, tasksState, windowState });
		const root = screen.getByRole('region', { name: REGION_NAME });
		const progress = root.element().querySelector('[data-slot="mini-player-progress"]');

		expect(progress?.getAttribute('style')).toMatch(/width:\s*0%/);

		timerState.start();
		ticker.tick(375_000);

		await expect
			.poll(() =>
				root.element().querySelector('[data-slot="mini-player-progress"]')?.getAttribute('style')
			)
			.toMatch(/width:\s*25%/);

		expect(screen.container.textContent).not.toMatch(/25%/);
	});
});

describe('MiniPlayer layout geometry', () => {
	it('spends the window height on content instead of dead space', async () => {
		const { timerState } = createTestTimer();
		const tasksState = await createEmptyTasksState();
		const { windowState } = createMiniWindowState();

		const screen = await render(MiniPlayer, { timerState, tasksState, windowState });
		const root = screen.getByRole('region', { name: REGION_NAME }).element();
		const row = root.querySelector('[data-slot="mini-player-row"]');

		// 48px window - 8px progress-bar strip = a 40px content row. The row used
		// to be 56px tall holding 24px of content, which left 16px of dead air
		// above and below and read as top-heavy.
		expect(root.getAttribute('class')).toContain('h-12');
		expect(row?.getAttribute('class')).toContain('h-10');
	});

	it('lays the columns out as a real grid so the task label cannot slide under the timer', async () => {
		const { timerState } = createTestTimer();
		const tasksState = await createEmptyTasksState();
		const { windowState } = createMiniWindowState();

		const screen = await render(MiniPlayer, { timerState, tasksState, windowState });
		const row = screen
			.getByRole('region', { name: REGION_NAME })
			.element()
			.querySelector('[data-slot="mini-player-row"]');

		// Symmetric 1fr tracks on both sides of the timer mean the label's box
		// ends where the timer begins — overlap is impossible by construction,
		// unlike `absolute left-1/2` where the label simply ran underneath.
		expect(row?.getAttribute('class')).toContain('grid');
		expect(row?.getAttribute('class')).toContain('1fr');
	});

	it('renders the timer in a monospace face so the digits do not shift width', async () => {
		const { timerState } = createTestTimer();
		const tasksState = await createEmptyTasksState();
		const { windowState } = createMiniWindowState();

		const screen = await render(MiniPlayer, { timerState, tasksState, windowState });
		const time = screen
			.getByRole('region', { name: REGION_NAME })
			.element()
			.querySelector('[data-slot="mini-player-time"]');

		expect(time?.getAttribute('class')).toContain('font-mono');
		expect(time?.getAttribute('class')).toContain('tabular-nums');
	});
});

describe('MiniPlayer marquee', () => {
	it('separates the duplicated label so the loop does not butt two titles together', async () => {
		const task = createFocusTask({ title: 'A task title long enough to overflow the column' });
		const repo = new FakeTaskRepository([task]);
		const tasksState = createTasksState(repo);
		await tasksState.load();
		tasksState.setActiveTask(task.id);

		const { timerState } = createTestTimer();
		const { windowState } = createMiniWindowState();

		const screen = await render(MiniPlayer, { timerState, tasksState, windowState });
		const root = screen.getByRole('region', { name: REGION_NAME });

		await userEvent.hover(root);

		const track = root.element().querySelector('[data-slot="mini-player-marquee-track"]');
		expect(track).not.toBeNull();
		expect(track?.getAttribute('class')).toContain('gap-');
	});
});
