// Renders one generated forest phase in one theme to a PNG, so a change can be looked at without
// starting the app.
//
//   pnpm illustrations:forest:preview <dawn|dark|oled> <1..5> [out.png]
//
// It inlines forest-palette.css, the phase markup and the theme tokens read from src/app.css, on a
// 1280x720 page (4x the 320x180 art grid). It is a static frame: the timer is not running, so it
// checks drawing and colour, not the app layout (centre clearance, contrast of the UI on top).
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const ILLUSTRATION_DIR = new URL('../../../src/lib/components/illustration/', import.meta.url);
const APP_CSS = new URL('../../../src/app.css', import.meta.url);

const [theme = 'dawn', phase = '1', out = `forest-phase-${phase}-${theme}.png`] =
	process.argv.slice(2);
if (!['dawn', 'dark', 'oled'].includes(theme) || !/^[1-5]$/.test(phase)) {
	throw new Error('usage: preview.mjs <dawn|dark|oled> <1..5> [out.png]');
}

/** The Rosé Pine tokens of one theme, copied from the real stylesheet so they cannot drift. */
function themeTokens() {
	const block = readFileSync(APP_CSS, 'utf8').match(
		new RegExp(`\\[data-theme='${theme}'\\]\\s*\\{([^}]*)\\}`)
	);
	if (!block) throw new Error(`theme ${theme} not found in src/app.css`);
	return block[1]
		.split(';')
		.filter((declaration) => /--(bg|accent)-/.test(declaration))
		.join(';');
}

const component = readFileSync(new URL(`forest-phase-${phase}.svelte`, ILLUSTRATION_DIR), 'utf8');
const markup = component.slice(component.indexOf('<g class="scene"'), component.indexOf('<style>'));
const style = component.slice(component.indexOf('<style>') + 7, component.indexOf('</style>'));
const palette = readFileSync(new URL('forest-palette.css', ILLUSTRATION_DIR), 'utf8');

const html = `<!doctype html><body style="margin:0"><style>${palette}${style}</style>
<div data-theme="${theme}" style="${themeTokens()};background:var(--bg-base);width:1280px;height:720px">
<svg data-illustration="forest" viewBox="0 0 320 180" width="1280" height="720" shape-rendering="crispEdges">${markup}</svg></div></body>`;

const page = join(mkdtempSync(join(tmpdir(), 'forest-preview-')), 'index.html');
writeFileSync(page, html);

const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'msedge' }));
try {
	const tab = await browser.newPage({ viewport: { width: 1280, height: 720 } });
	await tab.goto(pathToFileURL(page).href);
	await tab.screenshot({ path: out });
	console.log(`wrote ${out}`);
} finally {
	await browser.close();
}
