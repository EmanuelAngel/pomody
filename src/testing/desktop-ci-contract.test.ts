import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

function read(path: string): string {
	return readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
}

const DESKTOP_CI = read('.github/workflows/desktop-ci.yml');
const RELEASE = read('.github/workflows/release.yml');
const TAURI_CONF = JSON.parse(read('src-tauri/tauri.conf.json')) as {
	bundle: { createUpdaterArtifacts?: boolean };
	plugins: { updater: { endpoints: string[]; pubkey: string } };
};
const BUILD_ONLY_CONF = JSON.parse(read('src-tauri/tauri.build-only.conf.json')) as {
	bundle: { createUpdaterArtifacts?: boolean };
};

describe('Desktop CI workflow contract (auto-update)', () => {
	it('builds and publishes through tauri-action so latest.json and the signatures are generated', () => {
		expect(DESKTOP_CI).toContain('uses: tauri-apps/tauri-action@v1');
		expect(DESKTOP_CI).not.toContain('run: pnpm tauri:build');
	});

	it('signs the updater bundle with the private key kept as an Actions secret', () => {
		expect(DESKTOP_CI).toContain(
			'TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}'
		);
	});

	it('hands the release body to tauri-action, which does not inherit it for latest.json notes', () => {
		expect(DESKTOP_CI).toContain('gh release view');
		expect(DESKTOP_CI).toContain('releaseBody: ${{ steps.notes.outputs.body }}');
	});

	it('uploads to the release release-please created, and only when there is a release tag', () => {
		expect(DESKTOP_CI).toContain('tagName: ${{ inputs.release_tag }}');
	});

	it('keeps attaching the portable executable under its current name', () => {
		expect(DESKTOP_CI).toContain('src-tauri/target/release/pomody-desktop.exe');
	});

	it('builds without updater artifacts when there is no release tag, so PRs need no private key', () => {
		expect(DESKTOP_CI).toContain('--config src-tauri/tauri.build-only.conf.json');
		expect(BUILD_ONLY_CONF.bundle.createUpdaterArtifacts).toBe(false);
	});

	it('lets the release workflow pass the signing secret to the reusable desktop workflow', () => {
		expect(RELEASE).toContain('secrets: inherit');
	});
});

describe('Updater configuration contract', () => {
	it('creates updater artifacts for the real build', () => {
		expect(TAURI_CONF.bundle.createUpdaterArtifacts).toBe(true);
	});

	it('reads latest.json from the latest GitHub release of this repository', () => {
		expect(TAURI_CONF.plugins.updater.endpoints).toEqual([
			'https://github.com/EmanuelAngel/pomody/releases/latest/download/latest.json'
		]);
	});

	it('ships a non-empty public key', () => {
		expect(TAURI_CONF.plugins.updater.pubkey.length).toBeGreaterThan(40);
	});
});
