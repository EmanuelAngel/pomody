import type { DistractionRule } from '$lib/domain/distraction/distraction-rule.entity';
import type { IDistractionRuleRepository } from '$lib/domain/ports/distraction-repository.port';

/**
 * In-memory test fake implementing IDistractionRuleRepository.
 * Starts empty unless initial rules are provided, mirroring the adapter's "no seed" model.
 */
export class FakeDistractionRuleRepository implements IDistractionRuleRepository {
	private readonly rules = new Map<string, DistractionRule>();
	public saveCalls: DistractionRule[] = [];
	public deleteCalls: string[] = [];
	public clearAllCalls = 0;

	constructor(initialRules?: readonly DistractionRule[]) {
		for (const rule of initialRules ?? []) {
			this.rules.set(rule.id, rule);
		}
	}

	async getAll(): Promise<readonly DistractionRule[]> {
		return Object.freeze(Array.from(this.rules.values()));
	}

	async save(rule: DistractionRule): Promise<void> {
		this.saveCalls.push(rule);
		this.rules.set(rule.id, rule);
	}

	async delete(ruleId: string): Promise<void> {
		this.deleteCalls.push(ruleId);
		this.rules.delete(ruleId);
	}

	async clearAll(): Promise<void> {
		this.clearAllCalls++;
		this.rules.clear();
	}
}
