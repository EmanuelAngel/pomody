import {
	type DistractionRule,
	sanitizeDistractionRule
} from '$lib/domain/distraction/distraction-rule.entity';
import type { IDistractionRuleRepository } from '$lib/domain/ports/distraction-repository.port';

/**
 * In-memory test fake implementing IDistractionRuleRepository.
 * Starts empty unless initial rules are provided, mirroring the adapter's "no seed" model.
 *
 * `save` mirrors the adapter and runs the rule through {@link sanitizeDistractionRule},
 * dropping a rule the adapter would refuse to persist, so a state test cannot rely on
 * behavior the adapter does not have. The constructor is a deliberate escape hatch: it
 * seeds whatever it is given verbatim, for tests that need to inject a corrupt store.
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

		const sanitized = sanitizeDistractionRule(rule);
		if (sanitized === null) {
			return;
		}

		this.rules.set(sanitized.id, sanitized);
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
