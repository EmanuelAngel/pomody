import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ForestIllustration from './forest-illustration.svelte';

const groups = (container: Element, selector: string) =>
	[...container.querySelectorAll<SVGGElement>(selector)].map((el) => getComputedStyle(el));

describe('Forest phase 1 motion (Client Browser)', () => {
	it('hops individual pixels while animated, never the whole scene', async () => {
		const screen = await render(ForestIllustration, { phase: 0, animated: true });

		const from = groups(screen.container, 'g.from');
		const to = groups(screen.container, 'g.to');

		expect(from).toHaveLength(10);
		expect(to).toHaveLength(10);
		for (const style of [...from, ...to]) {
			expect(style.animationPlayState).toBe('running');
			expect(style.animationName).toContain('forest-hop');
		}
		const [scene] = groups(screen.container, 'g.scene');
		expect(scene.animationName).toBe('none');
	});

	it('keeps the pixels still while not animated', async () => {
		const screen = await render(ForestIllustration, { phase: 0, animated: false });

		for (const style of groups(screen.container, 'g.from, g.to')) {
			expect(style.animationPlayState).toBe('paused');
		}
	});

	it('desynchronises the groups so the pixels never blink in unison', async () => {
		const screen = await render(ForestIllustration, { phase: 0, animated: true });

		const phases = new Set(
			groups(screen.container, 'g.from').map((s) => `${s.animationDuration}/${s.animationDelay}`)
		);

		expect(phases.size).toBe(10);
	});

	it('steps between cells instead of sliding', async () => {
		const screen = await render(ForestIllustration, { phase: 0, animated: true });

		for (const style of groups(screen.container, 'g.from, g.to')) {
			expect(style.animationTimingFunction).toBe('steps(1)');
		}
	});
});
