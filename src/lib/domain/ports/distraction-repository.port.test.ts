import { describe, it, expect } from 'vitest';
import type { DistractionRule } from '../distraction/distraction-rule.entity';
import type {
	IDistractionRuleRepository,
	IDistractionWhitelistRepository
} from './distraction-repository.port';

function createRule(id: string): DistractionRule {
	return { id, exe: 'chrome', createdAt: 1_700_000_000_000 };
}

/** Test-local in-memory stub proving the rule repository port is implementable. */
class StubRuleRepository implements IDistractionRuleRepository {
	#rules: DistractionRule[] = [];

	async getAll(): Promise<readonly DistractionRule[]> {
		return [...this.#rules];
	}

	async save(rule: DistractionRule): Promise<void> {
		this.#rules = [...this.#rules.filter((candidate) => candidate.id !== rule.id), rule];
	}

	async delete(ruleId: string): Promise<void> {
		this.#rules = this.#rules.filter((rule) => rule.id !== ruleId);
	}

	async clearAll(): Promise<void> {
		this.#rules = [];
	}
}

/** Test-local in-memory stub proving the whitelist repository port is implementable. */
class StubWhitelistRepository implements IDistractionWhitelistRepository {
	#silenced = new Map<string, string[]>();

	async getSilenced(dateKey: string): Promise<readonly string[]> {
		return [...(this.#silenced.get(dateKey) ?? [])];
	}

	async silence(ruleId: string, dateKey: string): Promise<void> {
		this.#silenced.set(dateKey, [...(this.#silenced.get(dateKey) ?? []), ruleId]);
	}

	async clearAll(): Promise<void> {
		this.#silenced.clear();
	}
}

describe('IDistractionRuleRepository contract', () => {
	it('saves, lists, deletes and clears rules through the port interface', async () => {
		const repository: IDistractionRuleRepository = new StubRuleRepository();

		await repository.save(createRule('rule-1'));
		await repository.save(createRule('rule-2'));
		expect((await repository.getAll()).map((rule) => rule.id)).toEqual(['rule-1', 'rule-2']);

		await repository.save({ ...createRule('rule-1'), exe: 'steam' });
		expect((await repository.getAll()).length).toBe(2);

		await repository.delete('rule-1');
		expect((await repository.getAll()).map((rule) => rule.id)).toEqual(['rule-2']);

		await repository.clearAll();
		expect(await repository.getAll()).toEqual([]);
	});
});

describe('IDistractionWhitelistRepository contract', () => {
	it('silences rules per local date and clears all silences', async () => {
		const repository: IDistractionWhitelistRepository = new StubWhitelistRepository();

		expect(await repository.getSilenced('2026-10-16')).toEqual([]);

		await repository.silence('rule-1', '2026-10-16');
		await repository.silence('rule-2', '2026-10-17');

		expect(await repository.getSilenced('2026-10-16')).toEqual(['rule-1']);
		expect(await repository.getSilenced('2026-10-17')).toEqual(['rule-2']);

		await repository.clearAll();
		expect(await repository.getSilenced('2026-10-16')).toEqual([]);
	});
});
