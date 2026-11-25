import { describe, it, expect, vi } from 'vitest';
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

describe('Forest phase transitions (Client Browser)', () => {
	it('cross-fades the outgoing and the incoming phase instead of swapping instantly', async () => {
		const screen = await render(ForestIllustration, { phase: 0, animated: false });
		const scenes = () => [...screen.container.querySelectorAll('g.scene')];

		expect(scenes()).toHaveLength(1);

		await screen.rerender({ phase: 1, animated: false });

		// Both scenes must be in the document at once while the dissolve runs. An instant
		// swap — the behaviour without a transition — never shows two.
		await vi.waitFor(() => expect(scenes()).toHaveLength(2), { timeout: 200 });
		expect(screen.container.querySelector('svg')?.getAttribute('data-phase')).toBe('1');

		// The outgoing scene is dismissed once its fade ends, leaving the new phase alone.
		await vi.waitFor(() => expect(scenes()).toHaveLength(1), { timeout: 2000 });
	});

	it('keeps the dissolve symmetric so no frame shows an empty scene', async () => {
		const screen = await render(ForestIllustration, { phase: 0, animated: false });

		await screen.rerender({ phase: 2, animated: false });

		await vi.waitFor(
			() => {
				const opacities = [...screen.container.querySelectorAll('g.dissolve')].map((group) =>
					Number(getComputedStyle(group).opacity)
				);
				expect(opacities).toHaveLength(2);
				// Neither side may already be gone: the pair is mid-dissolve, so both are partial.
				for (const opacity of opacities) {
					expect(opacity).toBeGreaterThan(0);
				}
			},
			{ timeout: 200 }
		);
	});
});
