import { localDateKey } from '../../domain/history/focus-history-entry.entity';
import { planLegacyDailyStatsMigration } from '../../domain/history/legacy-daily-stats-migration';
import type { IFocusHistoryRepository } from '../../domain/ports/focus-history-repository.port';

/** Key of the retired daily counter. It lives on only inside this migration. */
export const LEGACY_DAILY_STATS_STORAGE_KEY = 'pomody:daily-stats';

export interface LegacyDailyStatsMigrationDeps {
	readonly repository: IFocusHistoryRepository;
	/** Defaults to `window.localStorage`; without any storage there is nothing to migrate. */
	readonly storage?: Storage;
	readonly now?: () => Date;
}

function resolveStorage(injected?: Storage): Storage | null {
	if (injected !== undefined) {
		return injected;
	}

	if (typeof window !== 'undefined') {
		try {
			return window.localStorage ?? null;
		} catch {
			return null;
		}
	}

	return null;
}

function parseLegacyRecord(raw: string): unknown {
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

/**
 * One-shot, idempotent conversion of the legacy `pomody:daily-stats` record into history entries.
 *
 * - Absent key: no-op.
 * - Today's record with blocks: its blocks are appended as migrated entries, then the history is
 *   re-read and the legacy key is removed ONLY if every planned entry is really there. When the history
 *   refuses the write (newer stored version, quota) the key stays and the next start tries again.
 * - Any other record (another day, zero blocks, garbage): the key is removed.
 *
 * Re-running after a crash between the appends and the removal cannot duplicate blocks: the migrated
 * entries already stored for that day are counted and only the missing ones are appended.
 * Never throws: the timer must start whatever happens to the old record.
 */
export async function migrateLegacyDailyStats(deps: LegacyDailyStatsMigrationDeps): Promise<void> {
	try {
		const storage = resolveStorage(deps.storage);
		if (storage === null) {
			return;
		}

		const raw = storage.getItem(LEGACY_DAILY_STATS_STORAGE_KEY);
		if (raw === null) {
			return;
		}

		const planned = planLegacyDailyStatsMigration(
			parseLegacyRecord(raw),
			(deps.now ?? (() => new Date()))()
		);

		if (planned.length > 0) {
			const dayKey = localDateKey(planned[0]);
			const countMigratedOfDay = async () =>
				(await deps.repository.getAll()).filter(
					(entry) =>
						entry.migrated === true &&
						entry.mode === 'focus' &&
						entry.outcome === 'completed' &&
						localDateKey(entry) === dayKey
				).length;

			const alreadyStored = await countMigratedOfDay();
			for (const entry of planned.slice(alreadyStored)) {
				await deps.repository.append(entry);
			}

			if ((await countMigratedOfDay()) < planned.length) {
				console.warn(
					'Legacy daily stats were not persisted to the history; keeping them for the next start.'
				);
				return;
			}
		}

		storage.removeItem(LEGACY_DAILY_STATS_STORAGE_KEY);
	} catch (error) {
		console.error('Legacy daily stats migration failed:', error);
	}
}
