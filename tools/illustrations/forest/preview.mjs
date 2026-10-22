// Renders one generated forest phase to a PNG, so a change can be looked at without starting the app.
//
//   pnpm illustrations:forest:preview <dawn|dark|oled> <1..5> [out.png]
//   pnpm illustrations:forest:preview all <1..5> [out.png] [--ref <image>]
//
// `all` puts Dawn, Dark and OLED side by side in one 2x2 sheet; with --ref the fourth cell shows a
// reference image (read from disk at preview time, never copied into the repo) to compare against.
//
// It inlines forest-palette.css, the phase markup and the theme tokens read from src/app.css, at
// 4x the 320x180 art grid (3x per cell in `all`). It is a static frame: the timer is not running,
// so it checks drawing and colour, not the app layout (centre clearance, contrast of the UI on top).
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const ILLUSTRATION_DIR = new URL('../../../src/lib/components/illustration/', import.meta.url);
const APP_CSS = new URL('../../../src/app.css', import.meta.url);
const THEMES = ['dawn', 'dark', 'oled'];

const args = process.argv.slice(2);
const refAt = args.indexOf('--ref');
const ref = refAt >= 0 ? args.splice(refAt, 2)[1] : null;
const [theme = 'dawn', phase = '1', out = `forest-phase-${phase}-${theme}.png`] = args;
if (![...THEMES, 'all'].includes(theme) || !/^[1-5]$/.test(phase)) {
	throw new Error('usage: preview.mjs <dawn|dark|oled|all> <1..5> [out.png] [--ref <image>]');
}

/** The Rosé Pine tokens of one theme, copied from the real stylesheet so they cannot drift. */
function themeTokens(name) {
	const block = readFileSync(APP_CSS, 'utf8').match(
		new RegExp(`\\[data-theme='${name}'\\]\\s*\\{([^}]*)\\}`)
	);
	if (!block) throw new Error(`theme ${name} not found in src/app.css`);
	return block[1]
		.split(';')
		.filter((declaration) => /--(bg|accent)-/.test(declaration))
		.join(';');
}

const component = readFileSync(new URL(`forest-phase-${phase}.svelte`, ILLUSTRATION_DIR), 'utf8');
const markup = component.slice(component.indexOf('<g class="scene"'), component.indexOf('<style>'));
const style = component.slice(component.indexOf('<style>') + 7, component.indexOf('</style>'));
const palette = readFileSync(new URL('forest-palette.css', ILLUSTRATION_DIR), 'utf8');

const scale = theme === 'all' ? 3 : 4;
const [w, h] = [320 * scale, 180 * scale];
const cell = (name) =>
	`<div data-theme="${name}" style="${themeTokens(name)};background:var(--bg-base);width:${w}px;height:${h}px">
<svg data-illustration="forest" viewBox="0 0 320 180" width="${w}" height="${h}" shape-rendering="crispEdges">${markup}</svg></div>`;
const refCell = ref
	? `<img src="${pathToFileURL(resolve(ref)).href}" style="width:${w}px;height:${h}px;display:block">`
	: `<div style="width:${w}px;height:${h}px;background:#888"></div>`;
const cells = theme === 'all' ? [refCell, ...THEMES.map(cell)] : [cell(theme)];
const cols = theme === 'all' ? 2 : 1;

const html = `<!doctype html><body style="margin:0"><style>${palette}${style}</style>
<div style="display:grid;grid-template-columns:repeat(${cols},${w}px)">${cells.join('')}</div></body>`;

const page = join(mkdtempSync(join(tmpdir(), 'forest-preview-')), 'index.html');
writeFileSync(page, html);

const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'msedge' }));
try {
	const rows = Math.ceil(cells.length / cols);
	const tab = await browser.newPage({ viewport: { width: w * cols, height: h * rows } });
	await tab.goto(pathToFileURL(page).href);
	await tab.screenshot({ path: out });
	console.log(`wrote ${out}`);
} finally {
	await browser.close();
}
