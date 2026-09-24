import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import TimerArc from './timer-arc.svelte';
import TimerDisplay from './timer-display.svelte';
import TimerControls from './timer-controls.svelte';
import Timer from './timer.svelte';
import { createTimerState } from '$lib/state/timer.svelte';

describe('TimerArc (Component Rendering)', () => {
	it('renders SVG progress arc with dimmed track circle', () => {
		const result = render(TimerArc, { props: { progress: 0.25, mode: 'focus' } });
		expect(result.body).toContain('<svg');
		expect(result.body).toContain('stroke-width="2.5"');
		expect(result.body).toContain('var(--accent-foam)');
	});

	it('renders mode stroke color per mode (foam / pine / iris)', () => {
		const focusResult = render(TimerArc, { props: { progress: 0.1, mode: 'focus' } });
		expect(focusResult.body).toContain('var(--accent-foam)');

		const shortResult = render(TimerArc, { props: { progress: 0.1, mode: 'shortBreak' } });
		expect(shortResult.body).toContain('var(--accent-pine)');

		const longResult = render(TimerArc, { props: { progress: 0.1, mode: 'longBreak' } });
		expect(longResult.body).toContain('var(--accent-iris)');
	});
});

describe('TimerDisplay (Component Rendering)', () => {
	it('renders mode label, formatted time and round cycle dots', () => {
		const result = render(TimerDisplay, {
			props: {
				formattedTime: '25:00',
				mode: 'focus',
				currentRound: 2,
				roundsBeforeLongBreak: 4
			}
		});

		expect(result.body).toContain('FOCUS');
		expect(result.body).toContain('25:00');
		expect(result.body).toContain('role="timer"');
		expect(result.body).toContain('role="status"');
	});

	it('renders accurate uppercase labels for break modes', () => {
		const shortResult = render(TimerDisplay, {
			props: {
				formattedTime: '05:00',
				mode: 'shortBreak',
				currentRound: 1
			}
		});
		expect(shortResult.body).toContain('SHORT BREAK');

		const longResult = render(TimerDisplay, {
			props: {
				formattedTime: '15:00',
				mode: 'longBreak',
				currentRound: 4
			}
		});
		expect(longResult.body).toContain('LONG BREAK');
	});
});

describe('TimerControls & Zen Mode (Component Rendering)', () => {
	it('renders accessible controls and fades secondary buttons in Zen mode', () => {
		const noop = () => {};

		// Idle / stopped state: Reset and Skip are fully visible
		const idleResult = render(TimerControls, {
			props: {
				isRunning: false,
				onPlayPause: noop,
				onReset: noop,
				onSkip: noop
			}
		});

		expect(idleResult.body).toContain('aria-label="Reset timer"');
		expect(idleResult.body).toContain('aria-label="Start timer"');
		expect(idleResult.body).toContain('aria-label="Skip to next session"');
		expect(idleResult.body).toContain('opacity-100');
		expect(idleResult.body).toContain('pointer-events-auto');

		// Running state: Zen mode activates opacity-0 pointer-events-none and disabled on Reset and Skip
		const runningResult = render(TimerControls, {
			props: {
				isRunning: true,
				isPaused: false,
				onPlayPause: noop,
				onReset: noop,
				onSkip: noop
			}
		});

		expect(runningResult.body).toContain('aria-label="Pause timer"');
		expect(runningResult.body).toContain('opacity-0');
		expect(runningResult.body).toContain('pointer-events-none');
		expect(runningResult.body).toContain('tabindex="-1"');
		expect(runningResult.body).toContain('disabled');

		// Paused state: Primary button displays "Resume timer"
		const pausedResult = render(TimerControls, {
			props: {
				isRunning: false,
				isPaused: true,
				onPlayPause: noop,
				onReset: noop,
				onSkip: noop
			}
		});

		expect(pausedResult.body).toContain('aria-label="Resume timer"');
	});
});

describe('Timer Orchestrator (Component Rendering)', () => {
	it('renders complete timer view integrated with state', () => {
		const dummyTicker = {
			isRunning: false,
			start: () => {},
			stop: () => {},
			destroy: () => {}
		};
		const state = createTimerState({ focusDurationSeconds: 1500 }, dummyTicker);
		const result = render(Timer, { props: { state } });

		expect(result.body).toContain('FOCUS');
		expect(result.body).toContain('25:00');
		expect(result.body).toContain('aria-label="Start timer"');
		expect(result.body).toContain('stroke-width="2.5"');
	});
});
