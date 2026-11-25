import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MetricsViewLoader from './metrics-view-loader.svelte';

describe('MetricsViewLoader (Client Browser)', () => {
	it('shows an error instead of a blank tab when the view cannot be loaded', async () => {
		const screen = await render(MetricsViewLoader, {
			load: () => Promise.reject(new Error('Failed to fetch dynamically imported module'))
		});

		await expect
			.element(screen.getByRole('alert'))
			.toHaveTextContent('Couldn’t open Metrics. Reload the app to try again.');
	});
});
