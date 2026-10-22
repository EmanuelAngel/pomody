// Shared forest palette: one ordered list of colour names used by all five phases.
// Dawn = Rosé Pine token mixes; Dark/OLED = hand-picked night colours (forest-palettes.mjs + NEW below).
import { RECIPES } from './scene.mjs';
import { DARK, OLED } from './forest-palettes.mjs';

/** [[token, share], ...] or a raw css colour; the remainder is --bg-base. */
const NEW = {
	// grass ground, lit -> deep
	gr1: [
		[
			['foam', 0.35],
			['gold', 0.45]
		],
		'#79c08a',
		'#79c08a'
	],
	gr2: [
		[
			['foam', 0.4],
			['gold', 0.3],
			['pine', 0.1]
		],
		'#559f82',
		'#559f82'
	],
	gr3: [
		[
			['pine', 0.3],
			['gold', 0.25],
			['foam', 0.2]
		],
		'#3b7e6c',
		'#3b7e6c'
	],
	gr4: [
		[
			['pine', 0.5],
			['gold', 0.15]
		],
		'#296357',
		'#245a50'
	],
	gr5: [
		[
			['pine', 0.7],
			['gold', 0.1]
		],
		'#1c4a47',
		'#133b3b'
	],
	lt: [
		[
			['foam', 0.45],
			['gold', 0.35]
		],
		'#b9e6a6',
		'#b9e6a6'
	],
	bk: [
		[
			['pine', 0.85],
			['iris', 0.12]
		],
		'#3a2f46',
		'#2b2336'
	],
	vine: [
		[
			['pine', 0.6],
			['foam', 0.3]
		],
		'#42906e',
		'#42906e'
	],
	fR: [[['love', 1]], '#eb6f92', '#eb6f92'],
	fP: [[['rose', 0.9]], '#e8a3b9', '#e8a3b9'],
	fY: [[['gold', 1]], '#f6c177', '#f6c177'],
	fV: [[['iris', 1]], '#c4a7e7', '#c4a7e7'],
	fW: ['var(--bg-surface)', '#e0def4', '#e0def4'],
	fO: [
		[
			['gold', 0.6],
			['love', 0.4]
		],
		'#f0966e',
		'#f0966e'
	],
	fB: [
		[
			['iris', 0.55],
			['pine', 0.5]
		],
		'#6e9bd8',
		'#6e9bd8'
	],
	ms: ['var(--bg-surface)', '#cfc7dd', '#cfc7dd']
};

export const NAMES = [...Object.keys(RECIPES), ...Object.keys(NEW)];
export const id = Object.fromEntries(NAMES.map((n, i) => [n, i + 1]));

const tok = (n) => `var(--accent-${n})`;
function recipeCss(comps) {
	if (typeof comps === 'string') return comps;
	const total = comps.reduce((s, [, w]) => s + w, 0);
	let rest = 1 - total;
	let css = 'var(--bg-base)';
	let first = true;
	for (const [token, w] of [...comps].reverse()) {
		if (first && rest <= 1e-6) {
			css = tok(token);
			rest = w;
			first = false;
			continue;
		}
		css = `color-mix(in srgb, ${tok(token)} ${Math.round((w / (rest + w)) * 100)}%, ${css})`;
		rest += w;
		first = false;
	}
	return css;
}

/** name -> { dawn, dark, oled } css colours. */
export const PAL = Object.fromEntries(
	NAMES.map((n) => {
		if (n in NEW) {
			const [dawn, dark, oled] = NEW[n];
			return [n, { dawn: recipeCss(dawn), dark, oled }];
		}
		return [n, { dawn: recipeCss(RECIPES[n]), dark: DARK[n], oled: OLED[n] }];
	})
);

/** Contents of forest-palette.css (the single place to retune the forest colours). */
export function paletteCss() {
	const block = (sel, theme) =>
		`${sel} {\n${NAMES.map((n) => `\t--forest-${n}: ${PAL[n][theme]};`).join('\n')}\n}\n`;
	return `/*
 * Forest illustration palette: the one place to retune the colours of all five phases.
 * Dawn mixes Rosé Pine tokens (so it follows the theme); Dark and OLED are hand-picked night
 * colours. Phases paint with fill="var(--forest-<name>)".
 *
 * s0-s6 sky       far1-4, w1-3 distant haze   m1-m6 hills   lh, lm, ll, ld, o1, o2, lt, vine leaves
 * d1-d7 soil      gr1-gr5 grass               t1-t3, bk bark   r1, r2 rocks   br brambles
 * fR, fP, fY, fV, fW, fO, fB flowers and fruit   ms mushroom stem
 */
${block("[data-illustration='forest']", 'dawn')}
${block("[data-theme='dark'] [data-illustration='forest']", 'dark')}
${block("[data-theme='oled'] [data-illustration='forest']", 'oled')}`;
}
