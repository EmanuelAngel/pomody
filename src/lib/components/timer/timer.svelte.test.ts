import { describe, it, expect, beforeEach, vi } from 'vitest';
import { tick } from 'svelte';
import { render } from 'vitest-browser-svelte';
import TimerArc from './timer-arc.svelte';
import TimerDisplay from './timer-display.svelte';
import TimerControls from './timer-controls.svelte';
import Timer from './timer.svelte';
import { createTimerState } from '$lib/state/timer.svelte';
// The clock's fixed-width digits are the Tailwind `tabular-nums` utility. In isolation nothing
// pulls `app.css` in (only `+layout.svelte` does), so without this import the utility is a no-op
// and the width of every digit would read as `normal`.
import '../../../app.css';
import { createBreaksState } from '$lib/state/breaks.svelte';
import { createBreakActivity } from '$lib/domain/breaks/break-activity.entity';
import { FakeBreakActivityRepository } from '$tests/fakes/repositories/fake-break-activity-repository';
import { localeState } from '$lib/state/locale.svelte';
import { FakeTicker } from '$tests/fakes/engine/fake-ticker';
import { FakeAudioNotifier } from '$tests/fakes/engine/fake-audio-notifier';
import { FakeSettingsStorage } from '$tests/fakes/repositories/fake-settings-storage';

const mockActivity = createBreakActivity({
	id: 'act-phys',
	title: 'Neck & Shoulder Release',
	category: 'physical',
	durationMinutes: 2,
	guide: '1. Tilt ear.\n2. Roll shoulders.'
});

/**
 * The computed transition list of an element, keyed by property. CSS reports the three lists
 * (property, duration, timing function) independently and repeats the short ones, so pairing them
 * here is what turns "some transition exists" into "this property moves at this speed".
 */
function transitions(element: Element) {
	const style = getComputedStyle(element);
	const properties = splitCssList(style.transitionProperty);
	const durations = splitCssList(style.transitionDuration);
	const timings = splitCssList(style.transitionTimingFunction);

	return new Map(
		properties.map((property, index) => [
			property,
			{
				duration: durations[index % durations.length],
				timingFunction: timings[index % timings.length]
			}
		])
	);
}

/** Comma-splits a CSS value list without breaking `cubic-bezier(...)` on its own commas. */
function splitCssList(value: string): string[] {
	const parts: string[] = [];
	let depth = 0;
	let current = '';

	for (const character of value) {
		if (character === '(') depth += 1;
		if (character === ')') depth -= 1;

		if (character === ',' && depth === 0) {
			parts.push(current.trim());
			current = '';
			continue;
		}

		current += character;
	}

	parts.push(current.trim());

	return parts;
}

/** The single "consumed" stroke of the progress arc. */
function arcStroke(container: Element): SVGElement {
	const stroke = container.querySelector<SVGElement>('circle[stroke-linecap="round"]');
	if (stroke === null) {
		throw new Error('The progress arc stroke is missing.');
	}

	return stroke;
}

describe('TimerArc (Client Browser)', () => {
	it('renders accessible progressbar with semantic attributes', async () => {
		const screen = await render(TimerArc, { progress: 0.25, mode: 'focus' });
		const progressbar = screen.getByRole('progressbar');

		await expect.element(progressbar).toBeVisible();
		await expect.element(progressbar).toHaveAttribute('aria-valuenow', '25');
		await expect.element(progressbar).toHaveAttribute('aria-valuemin', '0');
		await expect.element(progressbar).toHaveAttribute('aria-valuemax', '100');
		await expect.element(progressbar).toHaveAttribute('aria-label', 'Timer progress');
		await expect.element(progressbar).toHaveAttribute('data-mode', 'focus');
	});

	it('updates data-mode attribute per mode', async () => {
		const shortScreen = await render(TimerArc, { progress: 0, mode: 'shortBreak' });
		await expect
			.element(shortScreen.getByRole('progressbar'))
			.toHaveAttribute('data-mode', 'shortBreak');
		shortScreen.unmount();

		const longScreen = await render(TimerArc, { progress: 0, mode: 'longBreak' });
		await expect
			.element(longScreen.getByRole('progressbar'))
			.toHaveAttribute('data-mode', 'longBreak');
	});
});

describe('TimerArc interpolation and state cue (Client Browser)', () => {
	it('interpolates the consumed stroke between ticks instead of stepping once per tick', async () => {
		const screen = await render(TimerArc, { progress: 0.25, mode: 'focus' });
		const strokeTransitions = transitions(arcStroke(screen.container));

		// The ticker advances every 250ms; the interpolation covers one vocabulary step and is
		// linear because a progress indicator must travel at a constant speed.
		expect(strokeTransitions.get('stroke-dashoffset')).toEqual({
			duration: '0.2s',
			timingFunction: 'linear'
		});
		expect(strokeTransitions.get('stroke')?.timingFunction).toBe('cubic-bezier(0.25, 1, 0.5, 1)');
	});

	it('breathes the stroke while the block runs', async () => {
		const screen = await render(TimerArc, { progress: 0.25, mode: 'focus', state: 'running' });
		const style = getComputedStyle(arcStroke(screen.container));

		expect(style.animationName).toContain('arc-breathe');
		// A 2s+ cycle: fast enough to read as alive, slow enough not to pull the eye off the clock.
		expect(Number.parseFloat(style.animationDuration)).toBeGreaterThanOrEqual(2);
		expect(style.animationIterationCount).toBe('infinite');
	});

	it('holds the stroke still and dimmed while paused or finished', async () => {
		for (const state of ['paused', 'completed'] as const) {
			const screen = await render(TimerArc, { progress: 0.25, mode: 'focus', state });
			const style = getComputedStyle(arcStroke(screen.container));

			expect(style.animationName).toBe('none');
			expect(Number(style.strokeOpacity)).toBeLessThan(1);

			await screen.unmount();
		}
	});

	it('leaves the stroke at full opacity and motionless while idle', async () => {
		const screen = await render(TimerArc, { progress: 0.25, mode: 'focus', state: 'idle' });
		const style = getComputedStyle(arcStroke(screen.container));

		expect(style.animationName).toBe('none');
		expect(Number(style.strokeOpacity)).toBe(1);
	});
});

describe('TimerDisplay minute signal (Client Browser)', () => {
	it('keeps the digits fixed-width so the clock never reflows', async () => {
		const screen = await render(TimerDisplay, {
			formattedTime: '25:00',
			mode: 'focus',
			currentRound: 1,
			roundsBeforeLongBreak: 4
		});

		expect(getComputedStyle(screen.getByRole('timer').element()).fontVariantNumeric).toContain(
			'tabular-nums'
		);
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
		const breaksRepo = new FakeBreakActivityRepository([mockActivity]);
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
		const breaksRepo = new FakeBreakActivityRepository([mockActivity]);
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

	it('shows the waiting counter only while paused or finished, and clears it on continue', async () => {
		const ticker = new FakeTicker();
		const timerState = createTimerState({ focusDurationSeconds: 4 }, ticker);
		const breaksState = createBreaksState(new FakeBreakActivityRepository([mockActivity]));
		await breaksState.load();

		const screen = await render(Timer, { state: timerState, breaksState });
		const counter = () => screen.container.querySelector('[data-waiting-since]');

		expect(counter()).toBeNull();

		timerState.start();
		expect(counter()).toBeNull();

		timerState.pause();
		await vi.waitFor(() => {
			expect(counter()?.getAttribute('data-waiting-since')).toBe('paused');
		});
		await expect.element(screen.getByText(/^Paused for \d{2}:\d{2}$/)).toBeVisible();

		timerState.resume();
		await vi.waitFor(() => {
			expect(counter()).toBeNull();
		});

		ticker.simulateTick(4000);
		await vi.waitFor(() => {
			expect(counter()?.getAttribute('data-waiting-since')).toBe('completed');
		});

		timerState.start();
		await vi.waitFor(() => {
			expect(counter()).toBeNull();
		});
	});

	it('calls breaksState.resetCycle() when in focus mode', async () => {
		const dummyTicker = {
			isRunning: false,
			start: vi.fn(),
			stop: vi.fn(),
			destroy: vi.fn()
		};
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, dummyTicker);
		const breaksRepo = new FakeBreakActivityRepository([mockActivity]);
		const breaksState = createBreaksState(breaksRepo);
		await breaksState.load();
		const resetSpy = vi.spyOn(breaksState, 'resetCycle');

		await render(Timer, { state: timerState, breaksState });

		expect(resetSpy).toHaveBeenCalled();
	});
});

describe('Timer Reactive Localization (Client Browser)', () => {
	it('reactively updates TimerArc aria-label on locale change', async () => {
		const screen = await render(TimerArc, { progress: 0.5, mode: 'focus' });
		const progressbar = screen.getByRole('progressbar');

		await expect.element(progressbar).toHaveAttribute('aria-label', 'Timer progress');

		localeState.setLocale('es');
		await expect.element(progressbar).toHaveAttribute('aria-label', 'Progreso del temporizador');
	});

	it('reactively updates TimerDisplay mode label and aria-labels on locale change', async () => {
		const screen = await render(TimerDisplay, {
			formattedTime: '25:00',
			mode: 'focus',
			currentRound: 2,
			roundsBeforeLongBreak: 4
		});

		await expect.element(screen.getByText('FOCUS')).toBeVisible();
		await expect
			.element(screen.getByRole('timer'))
			.toHaveAttribute('aria-label', 'Time remaining: 25:00');
		const status = screen.container.querySelector('[role="status"]');
		expect(status?.getAttribute('aria-label')).toBe('Pomodoro cycle: 1 of 4 rounds completed');

		localeState.setLocale('es');

		await expect.element(screen.getByText('FOCO')).toBeVisible();
		await expect
			.element(screen.getByRole('timer'))
			.toHaveAttribute('aria-label', 'Tiempo restante: 25:00');
		await vi.waitFor(() => {
			expect(status?.getAttribute('aria-label')).toBe('Ciclo pomodoro: 1 de 4 rondas completadas');
		});
	});

	it('reactively updates TimerControls button aria-labels on locale change', async () => {
		const screen = await render(TimerControls, {
			isRunning: false,
			isPaused: false,
			onPlayPause: vi.fn(),
			onReset: vi.fn(),
			onSkip: vi.fn()
		});

		await expect
			.element(screen.getByRole('button', { name: 'Reset timer', exact: true }))
			.toBeVisible();
		await expect
			.element(screen.getByRole('button', { name: 'Start timer', exact: true }))
			.toBeVisible();
		await expect
			.element(screen.getByRole('button', { name: 'Skip to next session', exact: true }))
			.toBeVisible();

		localeState.setLocale('es');

		await expect
			.element(screen.getByRole('button', { name: 'Reiniciar temporizador', exact: true }))
			.toBeVisible();
		await expect
			.element(screen.getByRole('button', { name: 'Iniciar temporizador', exact: true }))
			.toBeVisible();
		await expect
			.element(screen.getByRole('button', { name: 'Saltar al siguiente bloque', exact: true }))
			.toBeVisible();
	});

	it('reactively updates full Timer orchestrator labels on locale change', async () => {
		const dummyTicker = {
			isRunning: false,
			start: vi.fn(),
			stop: vi.fn(),
			destroy: vi.fn()
		};
		const state = createTimerState({ focusDurationSeconds: 1500 }, dummyTicker);
		const screen = await render(Timer, { state });

		// Default English
		await expect.element(screen.getByText('FOCUS', { exact: true })).toBeVisible();
		await expect
			.element(screen.getByRole('button', { name: 'Start timer', exact: true }))
			.toBeVisible();
		await expect
			.element(screen.getByRole('button', { name: 'Reset timer', exact: true }))
			.toBeVisible();
		await expect
			.element(screen.getByRole('progressbar'))
			.toHaveAttribute('aria-label', 'Timer progress');

		// Switch to Spanish
		localeState.setLocale('es');

		await expect.element(screen.getByText('FOCO', { exact: true })).toBeVisible();
		await expect
			.element(screen.getByRole('button', { name: 'Iniciar temporizador', exact: true }))
			.toBeVisible();
		await expect
			.element(screen.getByRole('button', { name: 'Reiniciar temporizador', exact: true }))
			.toBeVisible();
		await expect
			.element(screen.getByRole('progressbar'))
			.toHaveAttribute('aria-label', 'Progreso del temporizador');

		// Interactivity in Spanish: Start -> Pause
		const startBtn = screen.getByRole('button', { name: 'Iniciar temporizador', exact: true });
		await startBtn.click();
		await expect
			.element(screen.getByRole('button', { name: 'Pausar temporizador', exact: true }))
			.toBeVisible();
	});
});

describe('Timer block end-time label (Client Browser)', () => {
	/** 15:00 local, the instant every expectation below is written against. */
	const START = new Date(2024, 0, 15, 15, 0, 0).getTime();
	const MINUTE = 60_000;
	let clock: number;
	let ticker: FakeTicker;

	beforeEach(() => {
		clock = START;
		ticker = new FakeTicker();
	});

	function createState(config?: Parameters<typeof createTimerState>[0]) {
		return createTimerState(
			config,
			ticker,
			new FakeAudioNotifier(),
			new FakeSettingsStorage({ blockEndTimeEnabled: true }),
			undefined,
			() => clock
		);
	}

	const line = (screen: { container: HTMLElement }) =>
		screen.container.querySelector('[data-timer-status-line]');
	const endLabel = (screen: { container: HTMLElement }) =>
		screen.container.querySelector('[data-block-end]');

	it('projects the end time of the block while idle', async () => {
		const screen = await render(Timer, { state: createState({ focusDurationSeconds: 1500 }) });

		await expect.element(screen.getByText('Would end at 15:25')).toBeVisible();
		expect(endLabel(screen)?.getAttribute('data-block-end')).toBe('idle');
		expect(screen.container.querySelector('[data-waiting-since]')).toBeNull();
	});

	it('shows the end time of a running block', async () => {
		const state = createState({ focusDurationSeconds: 1500 });
		const screen = await render(Timer, { state });

		state.start();

		await expect.element(screen.getByText('Ends at 15:25')).toBeVisible();
		expect(endLabel(screen)?.getAttribute('data-block-end')).toBe('running');
		expect(screen.container.querySelector('[data-waiting-since]')).toBeNull();
	});

	it('keeps the end time of a running block fixed while its minutes pass', async () => {
		const state = createState({ focusDurationSeconds: 1500 });
		const screen = await render(Timer, { state });

		state.start();
		await expect.element(screen.getByText('Ends at 15:25')).toBeVisible();

		clock += 5 * MINUTE;
		ticker.simulateTick(5 * MINUTE);
		await tick();

		expect(screen.container.textContent).toContain('Ends at 15:25');
		expect(screen.container.textContent).not.toContain('Ends at 15:30');
	});

	it('shares one centered line with the waiting counter and pushes the end forward while paused', async () => {
		const state = createState({ focusDurationSeconds: 1500 });
		const screen = await render(Timer, { state });

		state.start();
		clock += MINUTE;
		ticker.simulateTick(MINUTE);
		state.pause();
		await expect.element(screen.getByText('Ends at 15:25')).toBeVisible();

		clock += 10 * MINUTE;
		await tick();
		expect(endLabel(screen)?.textContent).toBe('Ends at 15:25');

		state.tickWallClock();
		await tick();
		expect(endLabel(screen)?.textContent).toBe('Ends at 15:35');

		const sharedLine = line(screen);
		expect(sharedLine).not.toBeNull();
		expect(sharedLine?.className).toContain('h-5');
		expect(sharedLine?.querySelector('[data-waiting-since="paused"]')).not.toBeNull();
		expect(sharedLine?.textContent).toContain(' · ');
	});

	it('freezes the pushed-back end time once the block resumes', async () => {
		const state = createState({ focusDurationSeconds: 1500 });
		const screen = await render(Timer, { state });

		state.start();
		clock += MINUTE;
		ticker.simulateTick(MINUTE);
		state.pause();
		clock += 10 * MINUTE;
		state.tickWallClock();
		state.resume();
		await expect.element(screen.getByText('Ends at 15:35')).toBeVisible();

		clock += 3 * MINUTE;
		ticker.simulateTick(3 * MINUTE);
		await tick();
		expect(endLabel(screen)?.textContent).toBe('Ends at 15:35');
	});

	it('labels break blocks the same way as focus blocks', async () => {
		const state = createState({ focusDurationSeconds: 1500, shortBreakDurationSeconds: 300 });
		const screen = await render(Timer, { state });

		state.skip();
		await expect.element(screen.getByText('Would end at 15:05')).toBeVisible();

		state.start();
		await expect.element(screen.getByText('Ends at 15:05')).toBeVisible();
	});

	it('drops the end time once the block completed and leaves the finished label alone', async () => {
		const state = createState({ focusDurationSeconds: 4 });
		const screen = await render(Timer, { state });

		state.start();
		clock += 4000;
		ticker.simulateTick(4000);

		await vi.waitFor(() => {
			expect(screen.container.querySelector('[data-waiting-since="completed"]')).not.toBeNull();
		});
		expect(endLabel(screen)).toBeNull();
		expect(screen.container.textContent).not.toContain('Ends at');
	});

	it('translates the end-time copy with the rest of the timer', async () => {
		const state = createState({ focusDurationSeconds: 1500 });
		const screen = await render(Timer, { state });

		await expect.element(screen.getByText('Would end at 15:25')).toBeVisible();

		localeState.setLocale('es');
		await expect.element(screen.getByText('Terminaría a las 15:25')).toBeVisible();

		state.start();
		await expect.element(screen.getByText('Termina a las 15:25')).toBeVisible();
	});
});

describe('Timer block end-time preference (Client Browser)', () => {
	/** 15:00 local, the instant every expectation below is written against. */
	const START = new Date(2024, 0, 15, 15, 0, 0).getTime();
	const MINUTE = 60_000;
	let clock: number;
	let ticker: FakeTicker;

	beforeEach(() => {
		clock = START;
		ticker = new FakeTicker();
	});

	function createState(options: { blockEndTimeEnabled?: boolean } = {}) {
		return createTimerState(
			{ focusDurationSeconds: 1500 },
			ticker,
			new FakeAudioNotifier(),
			new FakeSettingsStorage({ blockEndTimeEnabled: options.blockEndTimeEnabled ?? false }),
			undefined,
			() => clock
		);
	}

	const endLabels = (screen: { container: HTMLElement }) =>
		screen.container.querySelectorAll('[data-block-end]');

	it('hides the projected end time on the first render, before anything is stored', async () => {
		const state = createTimerState(
			{ focusDurationSeconds: 1500 },
			new FakeTicker(),
			new FakeAudioNotifier(),
			undefined,
			undefined,
			() => clock
		);

		const screen = await render(Timer, { state });

		expect(state.blockEndTimeEnabled).toBe(false);
		expect(endLabels(screen)).toHaveLength(0);
		expect(screen.container.textContent).not.toContain('Would end at');
	});

	it('hides the projected end time while idle when the preference is off', async () => {
		const screen = await render(Timer, {
			state: createState({ blockEndTimeEnabled: false })
		});

		const line = screen.container.querySelector('[data-timer-status-line]');
		expect(line).not.toBeNull();
		expect(endLabels(screen)).toHaveLength(0);
		expect(screen.container.textContent).not.toContain('Would end at');
		expect(screen.container.textContent).not.toContain('15:25');
	});

	it('hides the end time of a running block when the preference is off', async () => {
		const state = createState({ blockEndTimeEnabled: false });
		const screen = await render(Timer, { state });

		state.start();
		await tick();

		expect(endLabels(screen)).toHaveLength(0);
		expect(screen.container.textContent).not.toContain('Ends at');
	});

	it('leaves the waiting counter alone when the preference is off', async () => {
		const state = createState({ blockEndTimeEnabled: false });
		const screen = await render(Timer, { state });

		state.start();
		clock += MINUTE;
		ticker.simulateTick(MINUTE);
		state.pause();
		await tick();

		const line = screen.container.querySelector('[data-timer-status-line]');

		expect(line?.querySelector('[data-waiting-since="paused"]')).not.toBeNull();
		expect(endLabels(screen)).toHaveLength(0);
		expect(line?.textContent).not.toContain('·');
		expect(line?.textContent).not.toContain('Ends at');
	});

	it('keeps the reserved status line on one unbreakable row either way', async () => {
		const state = createState({ blockEndTimeEnabled: false });
		const screen = await render(Timer, { state });

		const line = screen.container.querySelector('[data-timer-status-line]');
		const content = line?.firstElementChild;

		expect(line?.className).toContain('h-5');
		expect(content?.className).toContain('whitespace-nowrap');
	});

	it('shows the label again the moment the preference is turned back on', async () => {
		const state = createState({ blockEndTimeEnabled: false });
		const screen = await render(Timer, { state });

		state.start();
		await tick();
		expect(endLabels(screen)).toHaveLength(0);

		state.setBlockEndTimeEnabled(true);

		await expect.element(screen.getByText('Ends at 15:25')).toBeVisible();
		expect(endLabels(screen)).toHaveLength(1);
	});
});
