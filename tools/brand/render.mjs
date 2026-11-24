/**
 * Renders the brand PNGs from the committed SVG sources in `docs/brand`.
 *
 * The SVG files are the source of truth; every PNG here is derived:
 * - `pomody-app-icon-1024.png` feeds `pnpm tauri icon`, which regenerates
 *   `src-tauri/icons` (Windows/macOS sets).
 * - `pomody-banner-{dark,light}.png` are the README header, picked by
 *   `prefers-color-scheme`.
 * - `pomody-sizes.png` is review evidence for the small sizes, never shipped.
 *
 * Run with `pnpm brand:render`. Needs a Chromium that Playwright can launch;
 * the bundled browser or Microsoft Edge both work.
 */
import { chromium } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(import.meta.dirname, '../..');
const brand = path.join(root, 'docs/brand');
const font = path.join(
	root,
	'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'
);
const scratch = path.join(root, '.impeccable/brand-render');

const asset = (name) => pathToFileURL(path.join(brand, name)).href;

fs.mkdirSync(scratch, { recursive: true });
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'msedge' }));

async function shot(css, body, width, height, out, dsf = 1) {
	// A unique file name per shot: Chromium caches by URL, and a reused name
	// silently serves the previous document.
	const page_file = path.join(scratch, `${Date.now()}-${out}.html`);
	fs.writeFileSync(
		page_file,
		`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`
	);
	const page = await browser.newPage({
		viewport: { width, height },
		deviceScaleFactor: dsf
	});
	await page.goto(pathToFileURL(page_file).href, { waitUntil: 'load' });
	await page.evaluate(() => document.fonts.ready);
	await page.waitForTimeout(250);
	await page.screenshot({ path: path.join(brand, out), omitBackground: true });
	await page.close();
	fs.rmSync(page_file, { force: true });
	console.log(`docs/brand/${out}`);
}

await shot(
	'html,body{margin:0;padding:0}img{display:block}',
	`<img src="${asset('pomody-app-icon.svg')}" width="1024" height="1024">`,
	1024,
	1024,
	'pomody-app-icon-1024.png'
);

const font_face = `@font-face{font-family:Inter;src:url('${pathToFileURL(font).href}') format('woff2');font-weight:100 900}`;

const banner_css = (bg, word, tag) => `
	${font_face}
	html,body{margin:0;box-sizing:border-box}
	body{width:1280px;height:400px;background:${bg};display:flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;-webkit-font-smoothing:antialiased}
	.lock{display:flex;align-items:center;gap:38px}
	.word{font-size:62px;font-weight:600;letter-spacing:-2.2px;color:${word};line-height:1}
	.tag{font-size:19px;color:${tag};margin-top:12px;letter-spacing:-0.1px}
`;

const banner_body = (mark) => `
	<div class="lock">
		<img src="${asset(mark)}" width="132" height="132" alt="">
		<div>
			<div class="word">Pomody</div>
			<div class="tag">Temporizador Pomodoro · foco real, sin bloatware</div>
		</div>
	</div>`;

await shot(
	banner_css('#191724', '#e0def4', '#908caa'),
	banner_body('pomody-mark.svg'),
	1280,
	400,
	'pomody-banner-dark.png',
	2
);
await shot(
	banner_css('#faf4ed', '#575279', '#797593'),
	banner_body('pomody-mark-dawn.svg'),
	1280,
	400,
	'pomody-banner-light.png',
	2
);

const row = [16, 32, 48, 64]
	.map(
		(size) =>
			`<div style="display:flex;flex-direction:column;align-items:center;gap:10px">
				<img src="${asset('pomody-app-icon.svg')}" width="${size}" height="${size}">
				<span style="font:11px ui-monospace,monospace;color:#908caa">${size}</span>
			</div>`
	)
	.join('');

await shot(
	`${font_face}
	html,body{margin:0;box-sizing:border-box}
	body{width:320px;padding:24px 20px;background:#26233a;display:flex;align-items:flex-end;gap:22px;font-family:Inter,sans-serif}`,
	row,
	320,
	140,
	'pomody-sizes.png'
);

await browser.close();
fs.rmSync(scratch, { recursive: true, force: true });
