import { describe, it, expect } from 'vitest';
import { NoopDistractionNotifier } from './noop-distraction-notifier';

describe('NoopDistractionNotifier', () => {
	const notifier = new NoopDistractionNotifier();

	it('should report the platform as unsupported', () => {
		expect(notifier.isSupported).toBe(false);
	});

	it('should report actions as unsupported', () => {
		expect(notifier.supportsActions).toBe(false);
	});

	it('should register actions without throwing', async () => {
		await expect(notifier.registerActions([])).resolves.toBeUndefined();
	});

	it('should return a no-op unregister function on subscription', () => {
		const unsubscribe = notifier.onAction(() => {});
		expect(typeof unsubscribe).toBe('function');
		expect(() => unsubscribe()).not.toThrow();
	});

	it('should refuse the notification permission without throwing', async () => {
		await expect(notifier.requestPermission()).resolves.toBe(false);
	});

	it('should resolve the notice without throwing and without showing anything', async () => {
		await expect(
			notifier.notify({
				title: 'Declared window',
				body: 'You went back to A.',
				ruleId: 'rule-1'
			})
		).resolves.toBeUndefined();
	});
});
