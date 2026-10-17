import { describe, it, expect, beforeEach } from 'vitest';
import { FakeDistractionRuleRepository } from './fake-distraction-rule-repository';
import type { IDistractionRuleRepository } from '$lib/domain/ports/distraction-repository.port';
import type { DistractionRule } from '$lib/domain/distraction/distraction-rule.entity';

function createRule(overrides: Partial<DistractionRule> = {}): DistractionRule {
	return {
		id: 'rule-1',
		exe: 'chrome',
		createdAt: 1_700_000_000_000,
		...overrides
	};
}

describe('FakeDistractionRuleRepository', () => {
	let repository: IDistractionRuleRepository & FakeDistractionRuleRepository;

	beforeEach(() => {
		repository = new FakeDistractionRuleRepository();
	});

	it('starts empty', async () => {
		await expect(repository.getAll()).resolves.toEqual([]);
	});

	it('seeds rules provided to the constructor', async () => {
		const seeded = new FakeDistractionRuleRepository([
			createRule({ id: 'a' }),
			createRule({ id: 'b' })
		]);

		await expect(seeded.getAll()).resolves.toEqual([
			createRule({ id: 'a' }),
			createRule({ id: 'b' })
		]);
	});

	it('saves, upserts and deletes rules', async () => {
		await repository.save(createRule({ id: 'a', exe: 'chrome' }));
		await repository.save(createRule({ id: 'b', exe: 'steam' }));
		await repository.save(createRule({ id: 'a', exe: 'firefox' }));

		await expect(repository.getAll()).resolves.toEqual([
			createRule({ id: 'a', exe: 'firefox' }),
			createRule({ id: 'b', exe: 'steam' })
		]);

		await repository.delete('b');
		await expect(repository.getAll()).resolves.toEqual([createRule({ id: 'a', exe: 'firefox' })]);
	});

	it('normalizes the rule it stores, like the adapter', async () => {
		await repository.save(
			createRule({
				id: '  a  ',
				exe: 'C:\\Program Files\\Chrome.EXE',
				titlePattern: '  YouTube  '
			})
		);

		await expect(repository.getAll()).resolves.toEqual([
			createRule({ id: 'a', exe: 'chrome', titlePattern: 'YouTube' })
		]);
	});

	it('drops a rule the adapter would refuse to persist', async () => {
		await repository.save(createRule({ id: '' }));
		await repository.save(createRule({ exe: '   ' }));
		await repository.save(createRule({ createdAt: 0 }));

		await expect(repository.getAll()).resolves.toEqual([]);
		expect(repository.saveCalls).toHaveLength(3);
	});

	it('clears every rule and records the calls it received', async () => {
		await repository.save(createRule({ id: 'a' }));
		await repository.save(createRule({ id: 'b' }));
		await repository.delete('a');
		await repository.clearAll();

		await expect(repository.getAll()).resolves.toEqual([]);
		expect(repository.saveCalls.map((rule) => rule.id)).toEqual(['a', 'b']);
		expect(repository.deleteCalls).toEqual(['a']);
		expect(repository.clearAllCalls).toBe(1);
	});

	it('returns a frozen collection', async () => {
		await repository.save(createRule());

		expect(Object.isFrozen(await repository.getAll())).toBe(true);
	});
});
