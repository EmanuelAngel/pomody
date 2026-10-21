import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import BlockNoticeToaster from './block-notice-toaster.svelte';
import { SonnerBlockToast } from '$lib/adapters/notification/sonner-block-toast';
import * as m from '$lib/paraglide/messages';

/**
 * Regression test for the first verification of this feature: the toast persisted but had
 * no way out, because svelte-sonner's `Toaster` defaults `closeButton` to false. The host
 * is rendered exactly as the layout renders it, so the wiring — not a re-creation of it —
 * is what this pins.
 */
describe('BlockNoticeToaster (Client Browser)', () => {
	it('should keep the notice past the default lifetime and offer the dismiss control', async () => {
		const screen = await render(BlockNoticeToaster, {});
		const port = new SonnerBlockToast();

		port.show({ title: 'Focus block completed', body: 'Take a short break.' });

		await expect.element(screen.getByText('Focus block completed')).toBeVisible();

		// Sonner's default lifetime is 4000 ms; the notice must outlive it.
		await new Promise((resolve) => setTimeout(resolve, 4500));
		await expect.element(screen.getByText('Focus block completed')).toBeVisible();

		// Clicking the body is not a dismissal.
		await screen.getByText('Focus block completed').click();
		await expect.element(screen.getByText('Focus block completed')).toBeVisible();

		const labels = Array.from(document.querySelectorAll('button')).map((button) =>
			button.getAttribute('aria-label')
		);
		expect(labels).toContain(m.block_notice_dismiss_aria());
	}, 25000);
});
