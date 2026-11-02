import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import WaitingSince from './waiting-since.svelte';
import { localeState } from '$lib/state/locale.svelte';

const BASE = 1_700_000_000_000;

describe('WaitingSince (Client Browser)', () => {
	beforeEach(() => {
		localeState.setLocale('es');
	});

	afterEach(() => {
		localeState.setLocale('en');
	});

	it('renders nothing while the timer is not waiting for the user', async () => {
		const screen = await render(WaitingSince, { waitingSince: null, kind: null });

		expect(screen.container.textContent?.trim()).toBe('');
	});

	it('names a pause with the elapsed time since it happened', async () => {
		const screen = await render(WaitingSince, {
			waitingSince: BASE,
			kind: 'paused',
			now: () => BASE + 45_000
		});

		await expect.element(screen.getByText('Pausado hace 00:45')).toBeVisible();
	});

	it('names a finished block with the elapsed time since it ended', async () => {
		const screen = await render(WaitingSince, {
			waitingSince: BASE,
			kind: 'completed',
			now: () => BASE + 3_720_000
		});

		await expect.element(screen.getByText('Bloque terminado hace 1:02:00')).toBeVisible();
	});

	it('keeps counting on its own while the user stays away', async () => {
		const startedAt = Date.now();
		const screen = await render(WaitingSince, {
			waitingSince: BASE,
			kind: 'paused',
			now: () => BASE + (Date.now() - startedAt)
		});

		await expect.element(screen.getByText('Pausado hace 00:00')).toBeVisible();
		await vi.waitFor(
			() => {
				expect(screen.container.textContent).toContain('Pausado hace 00:01');
			},
			{ timeout: 3000 }
		);
	});
});
