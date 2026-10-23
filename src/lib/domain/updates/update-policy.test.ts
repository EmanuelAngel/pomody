import { describe, it, expect } from 'vitest';
import { UPDATE_CHECK_INTERVAL_MS, isUpdateInstallBlocked } from './update-policy';

describe('UPDATE_CHECK_INTERVAL_MS', () => {
	it('is six hours', () => {
		expect(UPDATE_CHECK_INTERVAL_MS).toBe(6 * 60 * 60 * 1000);
	});
});

describe('isUpdateInstallBlocked', () => {
	it('blocks the install while a block is running', () => {
		expect(isUpdateInstallBlocked('running')).toBe(true);
	});

	it('blocks the install while a block is paused', () => {
		expect(isUpdateInstallBlocked('paused')).toBe(true);
	});

	it('allows the install when the timer is idle', () => {
		expect(isUpdateInstallBlocked('idle')).toBe(false);
	});

	it('allows the install when the timer is completed', () => {
		expect(isUpdateInstallBlocked('completed')).toBe(false);
	});
});
