import { describe, it, expect } from 'vitest';
import {
	UPDATE_CHECK_INTERVAL_MS,
	isUpdateInstallBlocked,
	shouldCheckForUpdate
} from './update-policy';

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

describe('shouldCheckForUpdate', () => {
	const now = 1_000_000_000;

	it('checks when there was never a check', () => {
		expect(shouldCheckForUpdate(null, now)).toBe(true);
	});

	it('does not check before six hours have passed', () => {
		expect(shouldCheckForUpdate(now - UPDATE_CHECK_INTERVAL_MS + 1, now)).toBe(false);
	});

	it('checks once exactly six hours have passed', () => {
		expect(shouldCheckForUpdate(now - UPDATE_CHECK_INTERVAL_MS, now)).toBe(true);
	});

	it('checks when the clock went backwards past the last check', () => {
		expect(shouldCheckForUpdate(now + 1, now)).toBe(true);
	});
});
