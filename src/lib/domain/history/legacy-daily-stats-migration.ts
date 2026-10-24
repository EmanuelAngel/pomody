import { sanitizeFocusHistoryEntry, type FocusHistoryEntry } from './focus-history-entry.entity';
import { getLocalDateString } from './local-date';

/** Even one-minute blocks cannot fill a day beyond this, so a larger count is a corrupt record. */
export const LEGACY_DAILY_STATS_MAX_BLOCKS = 24 * 60;
/** A legacy record cannot hold more minutes than a day of the largest block count. */
const MAX_LEGACY_MINUTES = LEGACY_DAILY_STATS_MAX_BLOCKS * 60;
const MS_PER_MINUTE = 60 * 1000;

function isNonNegativeInteger(value: unknown): value is number {
	return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/**
 * Plans the history entries that replace the legacy daily counter (`{ stats: { date, completedBlocks,
 * accumulatedMinutes } }`). Pure: it reads nothing and writes nothing.
 *
 * Only a record of today's local date with at least one block produces entries; anything else
 * (another day, zero blocks, garbage) plans nothing. Invalid fields count as zero, as the old loader did.
 * The record only kept totals, so the minutes are spread over the blocks in whole minutes: rounding
 * each entry the way the old counter did (`Math.round(durationMs / 60000)`) gives back the stored total.
 */
export function planLegacyDailyStatsMigration(legacy: unknown, now: Date): FocusHistoryEntry[] {
	if (typeof legacy !== 'object' || legacy === null || Array.isArray(legacy)) {
		return [];
	}

	const stats = (legacy as Record<string, unknown>).stats;
	if (typeof stats !== 'object' || stats === null || Array.isArray(stats)) {
		return [];
	}

	const { date, completedBlocks, accumulatedMinutes } = stats as Record<string, unknown>;
	if (date !== getLocalDateString(now)) {
		return [];
	}

	const blocks =
		isNonNegativeInteger(completedBlocks) && completedBlocks <= LEGACY_DAILY_STATS_MAX_BLOCKS
			? completedBlocks
			: 0;
	if (blocks === 0) {
		return [];
	}

	const minutes =
		isNonNegativeInteger(accumulatedMinutes) && accumulatedMinutes <= MAX_LEGACY_MINUTES
			? accumulatedMinutes
			: 0;
	const baseMinutes = Math.floor(minutes / blocks);
	const longerBlocks = minutes % blocks;
	// `0 -` instead of unary minus: avoids a negative zero for UTC.
	const utcOffsetMinutes = Math.round(0 - now.getTimezoneOffset());

	const entries: FocusHistoryEntry[] = [];
	for (let index = 0; index < blocks; index += 1) {
		const plannedMs = (baseMinutes + (index < longerBlocks ? 1 : 0)) * MS_PER_MINUTE;
		const entry = sanitizeFocusHistoryEntry({
			mode: 'focus',
			outcome: 'completed',
			plannedMs,
			elapsedMs: plannedMs,
			endedAt: now.getTime(),
			utcOffsetMinutes,
			migrated: true
		});
		if (entry === null) {
			// A plan that cannot be built in full must not be applied partially.
			return [];
		}
		entries.push(entry);
	}

	return entries;
}
