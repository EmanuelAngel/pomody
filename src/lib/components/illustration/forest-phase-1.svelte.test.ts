import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ForestIllustration from './forest-illustration.svelte';

const groups = (container: Element, selector: string) =>
	[...container.querySelectorAll<SVGGElement>(selector)].map((el) => getComputedStyle(el));

describe('Forest phase 1 motion (Client Browser)', () => {
	it('moves every foliage and seedling group while animated', async () => {
		const screen = await render(ForestIllustration, { phase: 0, animated: true });

		const leaves = groups(screen.container, 'g.leaf');
		const sprouts = groups(screen.container, 'g.sprout');

		expect(leaves).toHaveLength(5);
		expect(sprouts).toHaveLength(3);
		for (const style of [...leaves, ...sprouts]) {
			expect(style.animationPlayState).toBe('running');
			expect(style.animationName).toContain('forest-');
		}
	});

	it('keeps the groups paused while not animated', async () => {
		const screen = await render(ForestIllustration, { phase: 0, animated: false });

		for (const style of groups(screen.container, 'g.leaf, g.sprout')) {
			expect(style.animationPlayState).toBe('paused');
		}
	});

	it('desynchronises the groups so the scene never sways in unison', async () => {
		const screen = await render(ForestIllustration, { phase: 0, animated: true });

		const phases = new Set(
			groups(screen.container, 'g.leaf').map((s) => `${s.animationDuration}/${s.animationDelay}`)
		);

		expect(phases.size).toBe(5);
	});

	it('eases between positions instead of hopping', async () => {
		const screen = await render(ForestIllustration, { phase: 0, animated: true });

		for (const style of groups(screen.container, 'g.leaf, g.sprout')) {
			expect(style.animationTimingFunction).toBe('ease-in-out');
			expect(style.animationDirection).toBe('alternate');
		}
	});
});
