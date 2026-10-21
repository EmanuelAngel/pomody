import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { Toaster } from '$lib/components/ui/sonner';
import { SonnerBlockToast } from './sonner-block-toast';

/**
 * The `.svelte.test.ts` suffix is the repo's marker for the `client` Vitest project; this
 * file tests a plain adapter, but it needs a browser because the toast renders into the
 * document through sonner's portal.
 */
describe('SonnerBlockToast (Client Browser)', () => {
	it('should show the notice headline and body, and remove them when dismissed', async () => {
		const screen = await render(Toaster, { theme: 'dark' });
		const port = new SonnerBlockToast();

		const handle = port.show({
			title: 'Focus block completed',
			body: 'Take a short break.'
		});

		await expect.element(screen.getByText('Focus block completed')).toBeVisible();
		await expect.element(screen.getByText('Take a short break.')).toBeVisible();

		port.dismiss(handle);

		await expect.element(screen.getByText('Focus block completed')).not.toBeInTheDocument();
	});
});
