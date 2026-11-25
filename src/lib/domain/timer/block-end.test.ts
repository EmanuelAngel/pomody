import { describe, it, expect } from 'vitest';
import { formatClockTime, projectBlockEnd } from './block-end';

/** Local-time instants keep the assertions valid in any machine time zone. */
function local(hours: number, minutes: number, seconds = 0, millis = 0): number {
	return new Date(2024, 0, 15, hours, minutes, seconds, millis).getTime();
}

describe('formatClockTime', () => {
	it('should read back the wall clock as zero-padded 24-hour HH:MM', () => {
		expect(formatClockTime(local(15, 40))).toBe('15:40');
		expect(formatClockTime(local(9, 5))).toBe('09:05');
	});

	it('should use 24-hour hours instead of 12-hour AM/PM', () => {
		expect(formatClockTime(local(0, 0))).toBe('00:00');
		expect(formatClockTime(local(13, 0))).toBe('13:00');
		expect(formatClockTime(local(23, 59))).toBe('23:59');
	});

	it('should drop the seconds so a minute reads the same throughout its 60 seconds', () => {
		expect(formatClockTime(local(15, 40, 0))).toBe('15:40');
		expect(formatClockTime(local(15, 40, 59, 999))).toBe('15:40');
	});
});

describe('projectBlockEnd', () => {
	it('should add the remaining time to the current instant', () => {
		expect(projectBlockEnd(local(15, 0), 40 * 60_000)).toBe(local(15, 40));
	});

	it('should cross midnight when the block outlasts the day', () => {
		expect(formatClockTime(projectBlockEnd(local(23, 50), 20 * 60_000))).toBe('00:10');
	});

	it('should clamp a block that already ran out to the current instant', () => {
		expect(projectBlockEnd(local(15, 0), -60_000)).toBe(local(15, 0));
	});
});
