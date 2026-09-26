import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Header from './header.svelte';
import { createTimerState } from '$lib/state/timer.svelte';
import { createNavigationState } from '$lib/state/navigation.svelte';

function createDummyTicker(isRunning = false) {
	return {
		isRunning,
		start: vi.fn(),
		stop: vi.fn(),
		destroy: vi.fn()
	};
}

describe('Header (Client Browser)', () => {
	it('renders Pomody branding and title', async () => {
		const ticker = createDummyTicker(false);
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, ticker);

		const screen = await render(Header, { timerState });
		const brand = screen.getByText('Pomody');

		await expect.element(brand).toBeVisible();
	});

	it('renders navigation tabs with accessible WAI-ARIA attributes and interactive Planning tab', async () => {
		const ticker = createDummyTicker(false);
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, ticker);
		const navigationState = createNavigationState('timer');

		const screen = await render(Header, { timerState, navigationState });

		const timerTab = screen.getByRole('tab', { name: /Timer/i });
		await expect.element(timerTab).toBeVisible();
		await expect.element(timerTab).toHaveAttribute('id', 'tab-timer');
		await expect.element(timerTab).toHaveAttribute('aria-controls', 'tabpanel-timer');
		await expect.element(timerTab).toHaveAttribute('aria-selected', 'true');

		const planningTab = screen.getByRole('tab', { name: /^Planning$/i });
		await expect.element(planningTab).toBeVisible();
		await expect.element(planningTab).toHaveAttribute('id', 'tab-planning');
		await expect.element(planningTab).toHaveAttribute('aria-controls', 'tabpanel-planning');
		await expect.element(planningTab).toHaveAttribute('aria-selected', 'false');
		await expect.element(planningTab).not.toBeDisabled();

		const metricsTab = screen.getByRole('tab', { name: /Metrics/i });
		await expect.element(metricsTab).toBeVisible();
		await expect.element(metricsTab).toHaveAttribute('aria-disabled', 'true');
		await expect.element(metricsTab).toBeDisabled();

		const badges = screen.getByText('(in v0.2)');
		await expect.element(badges).toBeVisible();
	});

	it('switches active tab between Timer and Planning when tab buttons are clicked', async () => {
		const ticker = createDummyTicker(false);
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, ticker);
		const navigationState = createNavigationState('timer');

		const screen = await render(Header, { timerState, navigationState });

		const timerTab = screen.getByRole('tab', { name: /Timer/i });
		const planningTab = screen.getByRole('tab', { name: /^Planning$/i });

		await expect.element(timerTab).toHaveAttribute('aria-selected', 'true');
		await expect.element(planningTab).toHaveAttribute('aria-selected', 'false');
		expect(navigationState.activeTab).toBe('timer');

		// Click Planning tab
		await planningTab.click();

		await expect.element(planningTab).toHaveAttribute('aria-selected', 'true');
		await expect.element(timerTab).toHaveAttribute('aria-selected', 'false');
		expect(navigationState.activeTab).toBe('planning');

		// Click Timer tab
		await timerTab.click();

		await expect.element(timerTab).toHaveAttribute('aria-selected', 'true');
		await expect.element(planningTab).toHaveAttribute('aria-selected', 'false');
		expect(navigationState.activeTab).toBe('timer');
	});

	it('renders settings trigger button and calls onSettingsClick when clicked', async () => {
		const ticker = createDummyTicker(false);
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, ticker);
		const onSettingsClick = vi.fn();

		const screen = await render(Header, { timerState, onSettingsClick });
		const settingsBtn = screen.getByRole('button', { name: /Open settings/i });

		await expect.element(settingsBtn).toBeVisible();
		await settingsBtn.click();
		expect(onSettingsClick).toHaveBeenCalledTimes(1);
	});

	it('transitions to Zen mode with opacity-0 and pointer-events-none when timer is running', async () => {
		const ticker = createDummyTicker(true);
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, ticker);
		timerState.start();

		const screen = await render(Header, { timerState });
		const header = screen.getByRole('banner');

		await expect.element(header).toBeVisible();
		await expect.element(header).toHaveClass('opacity-0');
		await expect.element(header).toHaveClass('pointer-events-none');
	});

	it('is fully visible and interactive in idle/stopped state', async () => {
		const ticker = createDummyTicker(false);
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, ticker);

		const screen = await render(Header, { timerState });
		const header = screen.getByRole('banner');

		await expect.element(header).toHaveClass('opacity-100');
		await expect.element(header).toHaveClass('pointer-events-auto');
	});
});
