import type { IDistractionWhitelistRepository } from '$lib/domain/ports/distraction-repository.port';

/**
 * In-memory test fake implementing IDistractionWhitelistRepository.
 * Holds a single day at a time, like the persisted envelope, and applies the same lazy
 * purge as the adapter: reading on a different day drops the stale list.
 *
 * The port operations mirror the adapter's normalization, so a state test cannot rely on
 * behavior the adapter does not have: keys are trimmed, blank input is ignored without
 * storing anything, and a padded key still reads the day it names.
 */
export class FakeDistractionWhitelistRepository implements IDistractionWhitelistRepository {
	private silencedUntil: string | null;
	private ruleIds: string[];
	public silenceCalls: { ruleId: string; dateKey: string }[] = [];
	public unsilenceCalls: { ruleId: string; dateKey: string }[] = [];
	public clearAllCalls = 0;

	constructor(initial?: { silencedUntil: string; ruleIds: readonly string[] }) {
		this.silencedUntil = initial?.silencedUntil ?? null;
		this.ruleIds = initial ? [...initial.ruleIds] : [];
	}

	async getSilenced(dateKey: string): Promise<readonly string[]> {
		if (typeof dateKey !== 'string') {
			return Object.freeze([]);
		}

		const trimmedDate = dateKey.trim();
		if (trimmedDate.length === 0) {
			return Object.freeze([]);
		}

		if (this.silencedUntil === null || this.silencedUntil !== trimmedDate) {
			this.silencedUntil = null;
			this.ruleIds = [];
			return Object.freeze([]);
		}

		return Object.freeze([...this.ruleIds]);
	}

	async silence(ruleId: string, dateKey: string): Promise<void> {
		this.silenceCalls.push({ ruleId, dateKey });

		if (typeof ruleId !== 'string' || typeof dateKey !== 'string') {
			return;
		}

		const trimmedId = ruleId.trim();
		const trimmedDate = dateKey.trim();
		if (trimmedId.length === 0 || trimmedDate.length === 0) {
			return;
		}

		if (this.silencedUntil !== trimmedDate) {
			this.silencedUntil = trimmedDate;
			this.ruleIds = [];
		}

		if (!this.ruleIds.includes(trimmedId)) {
			this.ruleIds.push(trimmedId);
		}
	}

	async clearAll(): Promise<void> {
		this.clearAllCalls++;
		this.silencedUntil = null;
		this.ruleIds = [];
	}

	async unsilence(ruleId: string, dateKey: string): Promise<void> {
		this.unsilenceCalls.push({ ruleId, dateKey });

		if (typeof ruleId !== 'string' || typeof dateKey !== 'string') {
			return;
		}

		const trimmedId = ruleId.trim();
		const trimmedDate = dateKey.trim();
		if (trimmedId.length === 0 || trimmedDate.length === 0) {
			return;
		}

		if (this.silencedUntil === null || this.silencedUntil !== trimmedDate) {
			return;
		}

		this.ruleIds = this.ruleIds.filter((id) => id !== trimmedId);
	}
}
