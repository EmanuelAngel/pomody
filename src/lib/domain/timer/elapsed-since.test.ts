import { describe, it, expect } from 'vitest';
import { formatElapsed } from './elapsed-since';

describe('formatElapsed', () => {
	it('should floor to whole seconds so a just-finished block reads 00:00', () => {
		expect(formatElapsed(0)).toBe('00:00');
		expect(formatElapsed(999)).toBe('00:00');
		expect(formatElapsed(1000)).toBe('00:01');
	});

	it('should format elapsed time under one hour as MM:SS', () => {
		expect(formatElapsed(61_000)).toBe('01:01');
		expect(formatElapsed(3_599_000)).toBe('59:59');
	});

	it('should switch to H:MM:SS at one hour instead of counting past 59 minutes', () => {
		expect(formatElapsed(3_600_000)).toBe('1:00:00');
		expect(formatElapsed(86_400_000)).toBe('24:00:00');
	});

	it('should defensively guard negative elapsed time as 00:00', () => {
		expect(formatElapsed(-1000)).toBe('00:00');
	});
});
