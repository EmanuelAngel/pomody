import type { DistractionRule } from '../distraction/distraction-rule.entity';

/**
 * Persists the user's declared distractors. Only rules are stored, never observations
 * (spec §2 P2).
 */
export interface IDistractionRuleRepository {
	getAll(): Promise<readonly DistractionRule[]>;
	save(rule: DistractionRule): Promise<void>;
	delete(ruleId: string): Promise<void>;
	clearAll(): Promise<void>;
}

/**
 * Tracks rules silenced for a given local day. Entries are lazy-purged when the stored
 * date is no longer today (spec §7).
 */
export interface IDistractionWhitelistRepository {
	/** Rules silenced for the given local date (`YYYY-MM-DD`). */
	getSilenced(dateKey: string): Promise<readonly string[]>;
	silence(ruleId: string, dateKey: string): Promise<void>;
	clearAll(): Promise<void>;
}
