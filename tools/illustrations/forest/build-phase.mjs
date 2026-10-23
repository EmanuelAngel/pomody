// Generates the forest illustration components from code (dev tool, not part of the app bundle).
//
//   pnpm illustrations:forest          every phase + forest-palette.css
//   pnpm illustrations:forest 3        only phase 3 (+ forest-palette.css)
//
// Output goes to src/lib/components/illustration/. The scenes are deterministic (seeded noise), so
// regenerating without touching the code leaves `git diff` empty. See
// docs/features/compania-viva/adding-an-illustration.md.
import { writeFileSync } from 'node:fs';
import { emitLive } from './live.mjs';
import { NAMES, paletteCss } from './palette.mjs';
import { build } from './scene.mjs';

const OUT_DIR = new URL('../../../src/lib/components/illustration/', import.meta.url);
const arg = process.argv[2] ?? 'all';
const phases = arg === 'all' ? [1, 2, 3, 4, 5] : [Number(arg)];
if (phases.some((p) => !(p >= 1 && p <= 5))) throw new Error('usage: build-phase.mjs [all|1..5]');

for (const phase of phases) writePhase(phase);
writeFileSync(new URL('forest-palette.css', OUT_DIR), paletteCss());

function writePhase(phase) {
	const cv = build(phase);
	const { groups, count } = emitLive(cv, NAMES.length);

	const markup = groups
		.filter((g) => g.paths.length)
		.map((g) => {
			const paths = g.paths.map(
				(p) => `\t\t<path fill="var(--forest-${NAMES[p.id - 1]})" d="${p.d}" />`
			);
			return g.kind === 'static'
				? paths.join('\n')
				: `\t\t<g class="${g.kind} ${g.kind}-${g.n}">\n${paths.map((p) => '\t' + p).join('\n')}\n\t\t</g>`;
		})
		.join('\n');

	const periods = [3.4, 4.1, 4.8, 5.5, 6.2, 3.8, 4.5, 5.2, 5.9, 6.6];
	const delays = [-0.7, -2.9, -1.3, -4.6, -3.2, -0.2, -3.9, -2.1, -5.3, -1.8];
	const hopRules = periods
		.map(
			(p, n) =>
				`\t.from-${n},\n\t.to-${n} {\n\t\tanimation-duration: ${p}s;\n\t\tanimation-delay: ${delays[n]}s;\n\t}`
		)
		.join('\n\n');

	const TITLES = [
		'phase 1, "the clearing after the fire": fog-bound dead trunks, a hero sapling, charred ground and the first green shoots.',
		'phase 2, "the first leaves": the saplings have grown into leafy trees and grass covers the ground.',
		'phase 3, "the young forest": two giant trunks frame the clearing, flowering bushes and mossy logs.',
		'phase 4, "in bloom": hanging vines, ferns, bees and a carpet of wildflowers.',
		'phase 5, "the harvest": fruit in the canopy, berries, mushrooms, birds and butterflies.'
	];

	const out = `<svelte:options namespace="svg" />

<script lang="ts">
	let { animated = false }: { animated?: boolean } = $props();
</script>

<!--
	Forest · ${TITLES[phase - 1]}
	Drawn pixel by pixel on the 320x180 art grid; every pixel is a 1x1 rect merged into runs, so the
	grid stays crisp at any integer scale. Colours come from forest-palette.css.

	The scene never moves as a whole: a scattering of edge pixels of the foliage and the ground cover
	hop to a free neighbour cell and back (.from is where a pixel rests, .to where it lands), ten
	groups on their own period and phase, so leaves and blades shimmer pixel by pixel.
-->
<g class="scene" class:animated>
${markup}
</g>

<style>
	.to {
		opacity: 0;
	}

	.from,
	.to {
		animation-timing-function: steps(1, end);
		animation-iteration-count: infinite;
		animation-play-state: paused;
	}

	.from {
		animation-name: forest-hop-out;
	}

	.to {
		animation-name: forest-hop-in;
	}

${hopRules}

	.animated .from,
	.animated .to {
		animation-play-state: running;
	}

	@keyframes forest-hop-out {
		0% {
			opacity: 1;
		}
		70% {
			opacity: 0;
		}
	}

	@keyframes forest-hop-in {
		0% {
			opacity: 0;
		}
		70% {
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.from,
		.to {
			animation: none;
		}
	}
</style>
`;
	writeFileSync(new URL(`forest-phase-${phase}.svelte`, OUT_DIR), out);
	console.log(`phase ${phase}: ${count} rects, ${out.length} bytes`);
}
