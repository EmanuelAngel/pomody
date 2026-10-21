import { describe, it, expect } from 'vitest';
import { NoopBlockNotifier } from './noop-block-notifier';

describe('NoopBlockNotifier', () => {
	const notifier = new NoopBlockNotifier();

	it('should report the platform as unsupported', () => {
		expect(notifier.isSupported).toBe(false);
	});

	it('should refuse the notification permission without throwing', async () => {
		await expect(notifier.requestPermission()).resolves.toBe(false);
	});

	it('should resolve the notice without throwing and without showing anything', async () => {
		await expect(
			notifier.notify({
				title: 'Focus block completed',
				body: 'Take a short break.'
			})
		).resolves.toBeUndefined();
	});
});
