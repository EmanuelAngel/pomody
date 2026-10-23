import { describe, it, expect } from 'vitest';
import type { IUpdateChecker, UpdateInfo } from './update-checker.port';

/**
 * Minimal Web-shaped stub: the contract must be satisfiable by an adapter that cannot
 * update the application, without throwing (spec S9).
 */
const unsupportedChecker: IUpdateChecker = {
	isSupported: false,
	check(): Promise<UpdateInfo | null> {
		return Promise.resolve(null);
	},
	installPending(): Promise<void> {
		return Promise.resolve();
	}
};

describe('IUpdateChecker contract', () => {
	it('exposes an isSupported flag that an unsupported platform can report as false', () => {
		expect(unsupportedChecker.isSupported).toBe(false);
	});

	it('resolves check to null when there is no update to offer', async () => {
		await expect(unsupportedChecker.check()).resolves.toBeNull();
	});

	it('resolves installPending without throwing when there is nothing to install', async () => {
		await expect(unsupportedChecker.installPending()).resolves.toBeUndefined();
	});

	it('describes an available update by version, notes and publication date, and nothing else', () => {
		const info: UpdateInfo = {
			version: '0.20.0',
			notes: '### Features\n- Auto update',
			publishedAt: '2026-10-23T12:00:00Z'
		};

		expect(Object.keys(info).sort()).toEqual(['notes', 'publishedAt', 'version']);
	});
});
