// Forest palette: one ordered list of named colours shared by all five phases.
//
// Dawn is hand-picked from the reference art (daylight: green, brown, cream). Dark (sunset) and
// OLED (moonlit night) are derived from it in OKLab so the three themes cannot drift apart: the
// same scene under another light, with the far layers mixed toward the sky instead of being
// darkened on their own.

// [name, dawn hex, role]. Roles decide how the other themes are derived:
//   sky   - explicit per theme (SKY below)
//   haze  - far layers: placed between the sky and the deep foliage, by their dawn value
//   pop   - flowers, fruit, fauna: keep most of their colour
//   star  - only lit in OLED; elsewhere it is the colour of the top of the sky it sits on
//   base  - everything else
const COLOURS = [
	// sky, top -> glow at the horizon
	['s0', '#dfeecf', 'sky'],
	['s1', '#e6f0d2', 'sky'],
	['s2', '#eef3d5', 'sky'],
	['s3', '#f5f8d8', 'sky'],
	['s4', '#fcfadb', 'sky'],
	// far forest and hills, palest -> nearest
	['f1', '#e6edcb', 'haze'],
	['f2', '#d8e3bd', 'haze'],
	['f3', '#c8d6ae', 'haze'],
	['h1', '#c3cca5', 'haze'],
	['h2', '#b2c39c', 'haze'],
	['h3', '#93b08f', 'haze'],
	['h4', '#768c72', 'haze'],
	// soil, lit -> deepest
	['d1', '#8a7a52', 'base'],
	['d2', '#7a6c49', 'base'],
	['d3', '#695d42', 'base'],
	['d4', '#594f3b', 'base'],
	['d5', '#494334', 'base'],
	['d6', '#38342c', 'base'],
	['d7', '#252322', 'base'],
	// grass, lit -> deepest
	['g1', '#a3c45a', 'base'],
	['g2', '#86aa45', 'base'],
	['g3', '#6c923e', 'base'],
	['g4', '#567c3e', 'base'],
	['g5', '#3f6038', 'base'],
	['g6', '#2c432e', 'base'],
	// leaves, highlight -> deepest
	['l1', '#b1d570', 'base'],
	['l2', '#86b44d', 'base'],
	['l3', '#629441', 'base'],
	['l4', '#477338', 'base'],
	['l5', '#30552f', 'base'],
	['l6', '#1f3a27', 'base'],
	// bark, lit -> deepest
	['b1', '#8f765b', 'base'],
	['b2', '#6e5946', 'base'],
	['b3', '#54453a', 'base'],
	['b4', '#3c322d', 'base'],
	['b5', '#2a2321', 'base'],
	// rocks
	['r1', '#9a9d92', 'base'],
	['r2', '#6b6f6c', 'base'],
	['r3', '#474a4b', 'base'],
	// flowers
	['fR', '#d9474a', 'pop'],
	['fO', '#ee8a3a', 'pop'],
	['fY', '#f2cf4a', 'pop'],
	['fW', '#f6f3e2', 'pop'],
	['fP', '#e889a8', 'pop'],
	['fV', '#9a70c9', 'pop'],
	['fB', '#4f70c8', 'pop'],
	// fruit and mushrooms
	['aR', '#c8352f', 'pop'],
	['aR2', '#8c2528', 'pop'],
	['aO', '#ea8530', 'pop'],
	['aO2', '#b35a24', 'pop'],
	['aH', '#ffe2a8', 'pop'],
	['mC', '#eee2c6', 'pop'],
	['mB', '#a76a3d', 'pop'],
	// stars
	['st', '#ffffff', 'star'],
	['st2', '#ffffff', 'star']
];

// Dark: a Rosé Pine sunset (base -> iris -> love -> gold). OLED: black night, moonlit horizon.
const SKY = {
	dark: ['#232136', '#3a3352', '#6c4766', '#b8607a', '#eea27a'],
	oled: ['#000000', '#020306', '#070b16', '#111a2e', '#1d2b45']
};
const STARS = { st: '#f4f1ff', st2: '#8f97c8' };

// ---------------------------------------------------------------------------------------------
// OKLab
// ---------------------------------------------------------------------------------------------
const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function hexToLab(hex) {
	const [r, g, b] = [1, 3, 5].map((i) => toLin(parseInt(hex.slice(i, i + 2), 16) / 255));
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	return [
		0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
		1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
	];
}

function labToHex([L, a, b]) {
	const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
	const rgb = [
		4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
		-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
		-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
	];
	return (
		'#' +
		rgb
			.map((c) =>
				Math.round(Math.min(1, Math.max(0, toSrgb(Math.max(0, c)))) * 255)
					.toString(16)
					.padStart(2, '0')
			)
			.join('')
	);
}

const mixLab = (p, q, t) => p.map((v, i) => v + (q[i] - v) * t);

// ---------------------------------------------------------------------------------------------
// Night derivation
// ---------------------------------------------------------------------------------------------
// lightness curve [lift, span, power], colour kept, and the light the scene is tinted toward:
// warm plum against the sunset, cool moonlight at night
const CURVES = {
	dark: {
		base: [0.1, 0.46, 1.4],
		pop: [0.18, 0.58, 1.15],
		chroma: 0.85,
		tint: [hexToLab('#3b2742'), 0.2],
		hazeFrom: 2
	},
	oled: {
		base: [0.1, 0.5, 1.3],
		pop: [0.18, 0.6, 1.15],
		chroma: 0.75,
		tint: [hexToLab('#22345a'), 0.22],
		hazeFrom: 3
	}
};

function night(hex, role, theme) {
	const [L, a, b] = hexToLab(hex);
	const curve = CURVES[theme];
	const [lift, span, power] = curve[role === 'pop' ? 'pop' : 'base'];
	const chroma = role === 'pop' ? 0.92 : curve.chroma;
	const lab = [lift + span * L ** power, a * chroma, b * chroma];
	return labToHex(role === 'pop' ? lab : mixLab(lab, ...curve.tint));
}

const DAWN = Object.fromEntries(COLOURS.map(([n, hex]) => [n, hex]));
const lightness = (hex) => hexToLab(hex)[0];

/** A far layer keeps its place between the horizon glow and the deep foliage. */
function haze(hex, theme) {
	const glow = lightness(DAWN.s4);
	const deep = lightness(DAWN.l5);
	const t = Math.min(1, Math.max(0, (glow - lightness(hex)) / (glow - deep)));
	const horizon = hexToLab(SKY[theme][CURVES[theme].hazeFrom]);
	return labToHex(mixLab(horizon, hexToLab(night(DAWN.l5, 'base', theme)), t ** 0.8));
}

function themed(name, hex, role, theme) {
	if (role === 'star')
		return theme === 'oled' ? STARS[name] : theme === 'dawn' ? DAWN.s0 : SKY.dark[0];
	if (theme === 'dawn') return hex;
	if (role === 'sky') return SKY[theme][Number(name.slice(1))];
	if (role === 'haze') return haze(hex, theme);
	return night(hex, role, theme);
}

export const NAMES = COLOURS.map(([n]) => n);
export const id = Object.fromEntries(NAMES.map((n, i) => [n, i + 1]));

/** name -> { dawn, dark, oled } hex colours. */
export const PAL = Object.fromEntries(
	COLOURS.map(([n, hex, role]) => [
		n,
		Object.fromEntries(['dawn', 'dark', 'oled'].map((t) => [t, themed(n, hex, role, t)]))
	])
);

/** Contents of forest-palette.css (generated; retune the colours in palette.mjs). */
export function paletteCss() {
	const block = (sel, theme) =>
		`${sel} {\n${NAMES.map((n) => `\t--forest-${n}: ${PAL[n][theme]};`).join('\n')}\n}\n`;
	return `/*
 * Forest illustration palette, generated by tools/illustrations/forest/palette.mjs.
 * Dawn is the daylight scene; Dark and OLED are the same scene at dusk, derived from it.
 * Phases paint with fill="var(--forest-<name>)".
 *
 * s0-s4 sky   f1-f3 far forest   h1-h4 hills   d1-d7 soil   g1-g6 grass   l1-l6 leaves
 * b1-b5 bark   r1-r3 rocks   fR fO fY fW fP fV fB flowers   aR aR2 aO aO2 aH fruit   mC mB mushrooms
 */
${block("[data-illustration='forest']", 'dawn')}
${block("[data-theme='dark'] [data-illustration='forest']", 'dark')}
${block("[data-theme='oled'] [data-illustration='forest']", 'oled')}`;
}
