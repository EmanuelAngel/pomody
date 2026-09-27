import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import TimerArc from './timer-arc.svelte';
import TimerDisplay from './timer-display.svelte';
import TimerControls from './timer-controls.svelte';
import Timer from './timer.svelte';
import { createTimerState } from '$lib/state/timer.svelte';
import { createBreaksState } from '$lib/state/breaks.svelte';
import type { IBreakActivityRepository } from '$lib/domain/ports/break-activity-repository.port';
import { sortBreakActivities } from '$lib/domain/ports/break-activity-repository.port';
import {
	createBreakActivity,
	type BreakActivity,
	type BreakCategory
} from '$lib/domain/breaks/break-activity.entity';

class MockBreakActivityRepository implements IBreakActivityRepository {
	private activities = new Map<string, BreakActivity>();

	constructor(initialActivities: readonly BreakActivity[] = []) {
		for (const act of initialActivities) {
			this.activities.set(act.id, act);
		}
	}

	async getAll(): Promise<readonly BreakActivity[]> {
		return sortBreakActivities(Array.from(this.activities.values()));
	}

	async getByCategory(category: BreakCategory): Promise<readonly BreakActivity[]> {
		return sortBreakActivities(
			Array.from(this.activities.values()).filter((a) => a.category === category)
		);
	}

	async save(activity: BreakActivity): Promise<void> {
		this.activities.set(activity.id, activity);
	}

	async delete(activityId: string): Promise<void> {
		this.activities.delete(activityId);
	}

	async resetToDefaults(): Promise<void> {
		this.activities.clear();
	}

	async clearAll(): Promise<void> {
		this.activities.clear();
	}
}

const mockActivity = createBreakActivity({
	id: 'act-phys',
	title: 'Neck & Shoulder Release',
	category: 'physical',
	durationMinutes: 2,
	guide: '1. Tilt ear.\n2. Roll shoulders.'
});

describe('TimerArc (Client Browser)', () => {
	it('renders circular progress arc on dimmed track', async () => {
		const screen = await render(TimerArc, { progress: 0.25, mode: 'focus' });
		const svg = screen.container.querySelector('svg');
		expect(svg).not.toBeNull();

		const circles = screen.container.querySelectorAll('circle');
		expect(circles.length).toBe(2);

		// Track circle has stroke-width 2.5
		expect(circles[0].getAttribute('stroke-width')).toBe('2.5');

		// Progress circle maps to foam for focus mode
		expect(circles[1].style.stroke).toBe('var(--accent-foam)');
	});

	it('updates stroke color per mode (foam/pine/iris)', async () => {
		const shortScreen = await render(TimerArc, { progress: 0, mode: 'shortBreak' });
		const circlesShort = shortScreen.container.querySelectorAll('circle');
		expect(circlesShort[1].style.stroke).toBe('var(--accent-pine)');

		const longScreen = await render(TimerArc, { progress: 0, mode: 'longBreak' });
		const circlesLong = longScreen.container.querySelectorAll('circle');
		expect(circlesLong[1].style.stroke).toBe('var(--accent-iris)');
	});
});

describe('TimerDisplay (Client Browser)', () => {
	it('renders mode label, formatted time and cycle dots', async () => {
		const screen = await render(TimerDisplay, {
			formattedTime: '25:00',
			mode: 'focus',
			currentRound: 2,
			roundsBeforeLongBreak: 4
		});

		await expect.element(screen.getByText('FOCUS')).toBeVisible();
		await expect.element(screen.getByText('25:00')).toBeVisible();
		await expect.element(screen.getByRole('timer')).toBeVisible();
		await expect
			.element(screen.getByRole('timer'))
			.toHaveAttribute('aria-label', 'Time remaining: 25:00');

		const status = screen.container.querySelector('[role="status"]');
		expect(status).not.toBeNull();
		const dots = status?.querySelectorAll('span');
		expect(dots?.length).toBe(4);
	});

	it('renders accurate uppercase labels for break modes', async () => {
		const shortScreen = await render(TimerDisplay, {
			formattedTime: '05:00',
			mode: 'shortBreak',
			currentRound: 1
		});
		await expect.element(shortScreen.getByText('SHORT BREAK')).toBeVisible();
		await expect.element(shortScreen.getByText('05:00')).toBeVisible();

		const longScreen = await render(TimerDisplay, {
			formattedTime: '15:00',
			mode: 'longBreak',
			currentRound: 4
		});
		await expect.element(longScreen.getByText('LONG BREAK')).toBeVisible();
		await expect.element(longScreen.getByText('15:00')).toBeVisible();
	});
});

describe('TimerControls & Zen Mode (Client Browser)', () => {
	it('renders controls in idle state with active buttons', async () => {
		const screenIdle = await render(TimerControls, {
			isRunning: false,
			onPlayPause: vi.fn(),
			onReset: vi.fn(),
			onSkip: vi.fn()
		});

		const resetButton = screenIdle.getByRole('button', { name: 'Reset timer' });
		const playButton = screenIdle.getByRole('button', { name: 'Start timer' });
		const skipButton = screenIdle.getByRole('button', { name: 'Skip to next session' });

		await expect.element(resetButton).toBeVisible();
		await expect.element(playButton).toBeVisible();
		await expect.element(skipButton).toBeVisible();

		expect(resetButton.element().className).toContain('opacity-100');
		expect(resetButton.element().hasAttribute('disabled')).toBe(false);
	});

	it('applies native disabled and Zen mode fading when running', async () => {
		const screenRunning = await render(TimerControls, {
			isRunning: true,
			onPlayPause: vi.fn(),
			onReset: vi.fn(),
			onSkip: vi.fn()
		});

		const resetButtonZen = screenRunning.getByRole('button', {
			name: 'Reset timer',
			includeHidden: true
		});
		const pauseButton = screenRunning.getByRole('button', { name: 'Pause timer' });
		const skipButtonZen = screenRunning.getByRole('button', {
			name: 'Skip to next session',
			includeHidden: true
		});

		expect(resetButtonZen.element().className).toContain('opacity-0');
		expect(resetButtonZen.element().className).toContain('pointer-events-none');
		expect(resetButtonZen.element().hasAttribute('disabled')).toBe(true);

		expect(skipButtonZen.element().className).toContain('opacity-0');
		expect(skipButtonZen.element().className).toContain('pointer-events-none');
		expect(skipButtonZen.element().hasAttribute('disabled')).toBe(true);

		await expect.element(pauseButton).toBeVisible();
	});

	it('displays Resume timer label when paused', async () => {
		const screenPaused = await render(TimerControls, {
			isRunning: false,
			isPaused: true,
			onPlayPause: vi.fn(),
			onReset: vi.fn(),
			onSkip: vi.fn()
		});

		const resumeButton = screenPaused.getByRole('button', { name: 'Resume timer' });
		await expect.element(resumeButton).toBeVisible();
	});
});

describe('Timer Orchestrator Integration (Client Browser)', () => {
	it('handles start, pause and resume transitions interactively', async () => {
		const dummyTicker = {
			isRunning: false,
			start: vi.fn(),
			stop: vi.fn(),
			destroy: vi.fn()
		};
		const state = createTimerState({ focusDurationSeconds: 1500 }, dummyTicker);

		const screen = await render(Timer, { state });
		await expect.element(screen.getByText('FOCUS', { exact: true })).toBeVisible();
		await expect.element(screen.getByText('25:00')).toBeVisible();

		// Click Start
		const startBtn = screen.getByRole('button', { name: 'Start timer' });
		await startBtn.click();
		expect(state.isRunning).toBe(true);

		// Now button is Pause
		const pauseBtn = screen.getByRole('button', { name: 'Pause timer' });
		await pauseBtn.click();
		expect(state.isRunning).toBe(false);
		expect(state.state).toBe('paused');

		// Now button is Resume timer
		const resumeBtn = screen.getByRole('button', { name: 'Resume timer' });
		await expect.element(resumeBtn).toBeVisible();
		await resumeBtn.click();
		expect(state.isRunning).toBe(true);
	});
});

describe('Timer Slot Mode & BreakRevitalization Integration (Client Browser)', () => {
	it('swaps between TaskPill and BreakRevitalization based on mode', async () => {
		const dummyTicker = {
			isRunning: false,
			start: vi.fn(),
			stop: vi.fn(),
			destroy: vi.fn()
		};
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, dummyTicker);
		const breaksRepo = new MockBreakActivityRepository([mockActivity]);
		const breaksState = createBreaksState(breaksRepo);
		await breaksState.load();

		const screen = await render(Timer, { state: timerState, breaksState });

		// Focus mode -> TaskPill is visible, BreakRevitalization is not in document
		expect(screen.container.querySelector('[data-slot="task-pill"]')).not.toBeNull();
		expect(screen.container.querySelector('[data-slot="break-revitalization"]')).toBeNull();

		// Advance to shortBreak
		timerState.skip();
		expect(timerState.mode).toBe('shortBreak');

		await expect.element(screen.getByText('Neck & Shoulder Release')).toBeVisible();
		expect(screen.container.querySelector('[data-slot="break-revitalization"]')).not.toBeNull();
		await vi.waitFor(() => {
			expect(screen.container.querySelector('[data-slot="task-pill"]')).toBeNull();
		});

		// Advance to focus mode again
		timerState.skip();
		expect(timerState.mode).toBe('focus');

		await expect.element(screen.getByText('Free focus')).toBeVisible();
		expect(screen.container.querySelector('[data-slot="task-pill"]')).not.toBeNull();
		await vi.waitFor(() => {
			expect(screen.container.querySelector('[data-slot="break-revitalization"]')).toBeNull();
		});
	});

	it('renders empty slot during break when revitalizationEnabled is false', async () => {
		const dummyTicker = {
			isRunning: false,
			start: vi.fn(),
			stop: vi.fn(),
			destroy: vi.fn()
		};
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, dummyTicker);
		timerState.setRevitalizationEnabled(false);
		const breaksRepo = new MockBreakActivityRepository([mockActivity]);
		const breaksState = createBreaksState(breaksRepo);
		await breaksState.load();

		const screen = await render(Timer, { state: timerState, breaksState });

		// Advance to shortBreak
		timerState.skip();
		expect(timerState.mode).toBe('shortBreak');

		// Neither task pill nor break revitalization should be rendered
		await vi.waitFor(() => {
			expect(screen.container.querySelector('[data-slot="task-pill"]')).toBeNull();
		});
		expect(screen.container.querySelector('[data-slot="break-revitalization"]')).toBeNull();
	});

	it('calls breaksState.resetCycle() when in focus mode', async () => {
		const dummyTicker = {
			isRunning: false,
			start: vi.fn(),
			stop: vi.fn(),
			destroy: vi.fn()
		};
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, dummyTicker);
		const breaksRepo = new MockBreakActivityRepository([mockActivity]);
		const breaksState = createBreaksState(breaksRepo);
		await breaksState.load();
		const resetSpy = vi.spyOn(breaksState, 'resetCycle');

		await render(Timer, { state: timerState, breaksState });

		expect(resetSpy).toHaveBeenCalled();
	});
});
