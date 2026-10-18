import { describe, it, expect } from 'vitest';
import { NoopDistractionNotifier } from './noop-distraction-notifier';

describe('NoopDistractionNotifier', () => {
	const notifier = new NoopDistractionNotifier();

	it('should report the platform as unsupported', () => {
		expect(notifier.isSupported).toBe(false);
	});

	it('should refuse the notification permission without throwing', async () => {
		await expect(notifier.requestPermission()).resolves.toBe(false);
	});

	it('should resolve the notice without throwing and without showing anything', async () => {
		await expect(
			notifier.notify({ title: 'Declared window', body: 'You went back to A.' })
		).resolves.toBeUndefined();
	});
});
