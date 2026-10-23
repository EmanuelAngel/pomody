import { describe, it, expect } from 'vitest';
import { NoopUpdateChecker } from './noop-update-checker';

describe('NoopUpdateChecker', () => {
	const checker = new NoopUpdateChecker();

	it('should report the platform as unsupported', () => {
		expect(checker.isSupported).toBe(false);
	});

	it('should report no update available without throwing', async () => {
		await expect(checker.check()).resolves.toBeNull();
	});

	it('should resolve the install without throwing and without doing anything', async () => {
		await expect(checker.installPending()).resolves.toBeUndefined();
	});
});
