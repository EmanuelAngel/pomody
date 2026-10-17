import type { IDistractionWhitelistRepository } from '$lib/domain/ports/distraction-repository.port';

/**
 * In-memory test fake implementing IDistractionWhitelistRepository.
 * Holds a single day at a time, like the persisted envelope, and applies the same lazy
 * purge as the adapter: reading on a different day drops the stale list.
 */
export class FakeDistractionWhitelistRepository implements IDistractionWhitelistRepository {
	private silencedUntil: string | null;
	private ruleIds: string[];
	public silenceCalls: { ruleId: string; dateKey: string }[] = [];
	public clearAllCalls = 0;

	constructor(initial?: { silencedUntil: string; ruleIds: readonly string[] }) {
		this.silencedUntil = initial?.silencedUntil ?? null;
		this.ruleIds = initial ? [...initial.ruleIds] : [];
	}

	async getSilenced(dateKey: string): Promise<readonly string[]> {
		if (this.silencedUntil === null || this.silencedUntil !== dateKey) {
			this.silencedUntil = null;
			this.ruleIds = [];
			return Object.freeze([]);
		}

		return Object.freeze([...this.ruleIds]);
	}

	async silence(ruleId: string, dateKey: string): Promise<void> {
		this.silenceCalls.push({ ruleId, dateKey });

		if (this.silencedUntil !== dateKey) {
			this.silencedUntil = dateKey;
			this.ruleIds = [];
		}

		if (!this.ruleIds.includes(ruleId)) {
			this.ruleIds.push(ruleId);
		}
	}

	async clearAll(): Promise<void> {
		this.clearAllCalls++;
		this.silencedUntil = null;
		this.ruleIds = [];
	}
}
