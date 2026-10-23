import { describe, it, expect } from 'vitest';
import {
	LEGACY_DAILY_STATS_MAX_BLOCKS,
	planLegacyDailyStatsMigration
} from './legacy-daily-stats-migration';
import { localDateKey } from './focus-history-entry.entity';
import { getLocalDateString } from './local-date';

const NOW = new Date(2026, 9, 23, 14, 5, 0);
const TODAY = '2026-10-23';

function legacy(completedBlocks: unknown, accumulatedMinutes: unknown, date: unknown = TODAY) {
	return { version: 1, stats: { date, completedBlocks, accumulatedMinutes } };
}

/** The old counter added Math.round(durationMs / 60000) per block. */
function oldCounterMinutes(plannedMsList: readonly number[]): number {
	return plannedMsList.reduce((sum, plannedMs) => sum + Math.round(plannedMs / 60000), 0);
}

describe('getLocalDateString', () => {
	it('formats the local calendar day as YYYY-MM-DD', () => {
		expect(getLocalDateString(new Date(2026, 9, 3))).toBe('2026-10-03');
		expect(getLocalDateString(new Date(2026, 0, 31, 23, 59))).toBe('2026-01-31');
	});
});

describe('planLegacyDailyStatsMigration', () => {
	it.each([
		{ blocks: 4, minutes: 100 },
		{ blocks: 3, minutes: 50 },
		{ blocks: 1, minutes: 25 },
		{ blocks: 2, minutes: 0 },
		{ blocks: 7, minutes: 3 }
	])('turns $blocks blocks / $minutes minutes into entries that add up exactly', (stats) => {
		const entries = planLegacyDailyStatsMigration(legacy(stats.blocks, stats.minutes), NOW);

		expect(entries).toHaveLength(stats.blocks);
		expect(oldCounterMinutes(entries.map((entry) => entry.plannedMs))).toBe(stats.minutes);
	});

	it('gives every entry whole minutes, differing by at most one', () => {
		const entries = planLegacyDailyStatsMigration(legacy(3, 50), NOW);
		const minutes = entries.map((entry) => entry.plannedMs / 60000);

		expect(minutes.every(Number.isInteger)).toBe(true);
		expect(Math.max(...minutes) - Math.min(...minutes)).toBeLessThanOrEqual(1);
		expect([...minutes].sort()).toEqual([16, 17, 17]);
	});

	it('marks every entry as a migrated, completed focus block of the current moment', () => {
		const entries = planLegacyDailyStatsMigration(legacy(4, 100), NOW);

		for (const entry of entries) {
			expect(entry).toEqual({
				mode: 'focus',
				outcome: 'completed',
				plannedMs: 1_500_000,
				elapsedMs: 1_500_000,
				endedAt: NOW.getTime(),
				utcOffsetMinutes: 0 - NOW.getTimezoneOffset(),
				migrated: true
			});
			expect(localDateKey(entry)).toBe(TODAY);
		}
	});

	it('plans nothing when there are no blocks', () => {
		expect(planLegacyDailyStatsMigration(legacy(0, 0), NOW)).toEqual([]);
		expect(planLegacyDailyStatsMigration(legacy(0, 25), NOW)).toEqual([]);
	});

	it('plans nothing for a record of another day', () => {
		expect(planLegacyDailyStatsMigration(legacy(4, 100, '2026-10-22'), NOW)).toEqual([]);
		expect(planLegacyDailyStatsMigration(legacy(4, 100, '2026-10-24'), NOW)).toEqual([]);
	});

	it.each([
		['null', null],
		['a string', 'garbage'],
		['an array', []],
		['no stats', { version: 1 }],
		['stats that is not an object', { version: 1, stats: 5 }],
		['no date', { version: 1, stats: { completedBlocks: 2, accumulatedMinutes: 50 } }],
		['a non-string date', legacy(2, 50, 20261023)],
		['negative blocks', legacy(-1, 25)],
		['fractional blocks', legacy(1.5, 25)],
		['non-numeric blocks', legacy('2', 50)],
		['NaN blocks', legacy(Number.NaN, 50)],
		['more blocks than a day can hold', legacy(LEGACY_DAILY_STATS_MAX_BLOCKS + 1, 50)]
	])('plans nothing for %s', (_label, value) => {
		expect(planLegacyDailyStatsMigration(value, NOW)).toEqual([]);
	});

	it('treats invalid minutes like the old loader did: as zero, keeping the blocks', () => {
		for (const minutes of [-5, 2.5, '25', Number.NaN, undefined, null]) {
			const entries = planLegacyDailyStatsMigration(legacy(2, minutes), NOW);

			expect(entries).toHaveLength(2);
			expect(entries.every((entry) => entry.plannedMs === 0)).toBe(true);
		}
	});

	it('does not require the envelope version, like the old loader', () => {
		const entries = planLegacyDailyStatsMigration(
			{ stats: { date: TODAY, completedBlocks: 1, accumulatedMinutes: 25 } },
			NOW
		);

		expect(entries).toHaveLength(1);
	});
});
