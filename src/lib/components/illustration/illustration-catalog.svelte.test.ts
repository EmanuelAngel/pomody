import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { ILLUSTRATION_CATALOG } from '$lib/domain/illustration/illustration-catalog';
import { ILLUSTRATION_RENDERERS } from './renderers';

for (const entry of ILLUSTRATION_CATALOG) {
	describe(`${entry.id} illustration contract`, () => {
		const Renderer = ILLUSTRATION_RENDERERS[entry.id];

		it('declares a renderer for the catalog entry', () => {
			expect(Renderer).toBeDefined();
		});

		for (let phase = 0; phase < entry.phaseCount; phase += 1) {
			it(`renders phase ${phase}`, async () => {
				const screen = await render(Renderer, { phase });
				const svg = screen.container.querySelector('svg');

				expect(svg).not.toBeNull();
				expect(svg?.getAttribute('data-illustration')).toBe(entry.id);
				expect(svg?.getAttribute('data-phase')).toBe(String(phase));
			});
		}

		it('clamps out-of-range phases to the valid window', async () => {
			const high = await render(Renderer, { phase: 99 });
			expect(high.container.querySelector('svg')?.getAttribute('data-phase')).toBe(
				String(entry.phaseCount - 1)
			);

			const low = await render(Renderer, { phase: -3 });
			expect(low.container.querySelector('svg')?.getAttribute('data-phase')).toBe('0');
		});

		it('toggles the ambient animation class', async () => {
			const still = await render(Renderer, { phase: 0, animated: false });
			expect(still.container.querySelector('svg')?.classList.contains('animated')).toBe(false);

			const animated = await render(Renderer, { phase: 0, animated: true });
			expect(animated.container.querySelector('svg')?.classList.contains('animated')).toBe(true);
		});
	});
}
