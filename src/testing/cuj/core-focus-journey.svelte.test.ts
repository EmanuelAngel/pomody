import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CujTestShell from './cuj-test-shell.svelte';
import { createTimerState } from '$lib/state/timer.svelte';
import { createDailyStatsState } from '$lib/state/daily-stats.svelte';
import { createBreaksState } from '$lib/state/breaks.svelte';
import { FakeTicker } from '$tests/fakes/engine/fake-ticker';
import { FakeAudioNotifier } from '$tests/fakes/engine/fake-audio-notifier';
import { FakeDailyStatsRepository } from '$tests/fakes/repositories/fake-daily-stats-repository';
import { FakeBreakActivityRepository } from '$tests/fakes/repositories/fake-break-activity-repository';
import { createBreakActivityFixture } from '$tests/fixtures/break-activity.fixture';

describe('CUJ 1: Core Focus Loop (Browser)', () => {
	it('executes full focus block lifecycle: idle -> running -> Zen mode -> intermediate tick -> completion -> daily stats increment -> break transition', async () => {
		// 1. Arrange: setup isolated in-memory test fakes and state instances
		const fakeTicker = new FakeTicker();
		const fakeAudio = new FakeAudioNotifier();
		const timerState = createTimerState(
			{
				focusDurationSeconds: 1500,
				shortBreakDurationSeconds: 300,
				roundsBeforeLongBreak: 4
			},
			fakeTicker,
			fakeAudio
		);
		const dailyStatsRepo = new FakeDailyStatsRepository();
		const dailyStatsState = createDailyStatsState(dailyStatsRepo, timerState);
		const breaksRepo = new FakeBreakActivityRepository([
			createBreakActivityFixture({ id: 'act-1', title: 'Neck & Shoulder Stretch' })
		]);
		const breaksState = createBreaksState(breaksRepo);
		await breaksState.load();

		// Render isolated CUJ test harness
		const screen = await render(CujTestShell, {
			timerState,
			dailyStatsState,
			breaksState
		});

		// a) Estado Inicial
		await expect.element(screen.getByText('FOCUS', { exact: true })).toBeVisible();
		await expect.element(screen.getByText('25:00')).toBeVisible();
		await expect.element(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
		await expect.element(screen.getByRole('button', { name: 'Start timer' })).toBeVisible();
		await expect
			.element(screen.getByTestId('daily-focus-counter'))
			.toHaveTextContent('0 blocks · 0m');

		// b) Iniciar Sesión
		const startButton = screen.getByRole('button', { name: 'Start timer' });
		await startButton.click();

		// Botón cambia a Pause timer
		const pauseButton = screen.getByRole('button', { name: 'Pause timer' });
		await expect.element(pauseButton).toBeVisible();

		// Zen mode: controles secundarios y DailyCounter se ocultan/atenúan semánticamente
		const resetButton = screen.getByRole('button', {
			name: 'Reset timer',
			includeHidden: true
		});
		const skipButton = screen.getByRole('button', {
			name: 'Skip to next session',
			includeHidden: true
		});
		const dailyCounter = screen.getByTestId('daily-focus-counter');

		await expect.element(resetButton).toBeDisabled();
		await expect.element(resetButton).toHaveAttribute('aria-hidden', 'true');
		await expect.element(skipButton).toBeDisabled();
		await expect.element(skipButton).toHaveAttribute('aria-hidden', 'true');

		await expect.element(dailyCounter).toHaveAttribute('aria-hidden', 'true');

		// c) Avance a la mitad (12.5 min = 750,000 ms)
		fakeTicker.advanceByMs(750000);

		await expect.element(screen.getByText('12:30')).toBeVisible();
		await expect.element(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');

		// d) Completitud del bloque (750,000 ms restantes)
		fakeTicker.advanceByMs(750000);

		// Audio notificación disparada con modo 'focus'
		expect(fakeAudio.notifyBlockCompletedCalls).toContain('focus');

		// DailyCounter actualizado visiblemente
		await expect
			.element(screen.getByTestId('daily-focus-counter'))
			.toHaveTextContent('1 block · 25m');
		await expect.element(dailyCounter).not.toHaveAttribute('aria-hidden');

		// Repositorio persistido
		expect(dailyStatsRepo.stats.completedBlocks).toBe(1);
		expect(dailyStatsRepo.stats.accumulatedMinutes).toBe(25);

		// e) Transición a Short Break
		const startBreakButton = screen.getByRole('button', { name: 'Start timer' });
		await expect.element(startBreakButton).toBeVisible();
		await startBreakButton.click();

		expect(timerState.mode).toBe('shortBreak');
		expect(timerState.isRunning).toBe(true);

		await expect.element(screen.getByText('SHORT BREAK', { exact: true })).toBeVisible();
		await expect.element(screen.getByText('05:00')).toBeVisible();

		// El slot inferior muestra BreakRevitalization con 'Neck & Shoulder Stretch' en lugar de TaskPill
		await expect.element(screen.getByText('Neck & Shoulder Stretch')).toBeVisible();
		expect(screen.container.querySelector('[data-slot="break-revitalization"]')).not.toBeNull();
		await vi.waitFor(() => {
			expect(screen.container.querySelector('[data-slot="task-pill"]')).toBeNull();
		});

		// Cleanup
		timerState.destroy();
		dailyStatsState.destroy();
	});
});
