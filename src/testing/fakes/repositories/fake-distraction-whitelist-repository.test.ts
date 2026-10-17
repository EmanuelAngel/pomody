import { describe, it, expect, beforeEach } from 'vitest';
import { FakeDistractionWhitelistRepository } from './fake-distraction-whitelist-repository';
import type { IDistractionWhitelistRepository } from '$lib/domain/ports/distraction-repository.port';

const TODAY = '2026-10-16';
const TOMORROW = '2026-10-17';

describe('FakeDistractionWhitelistRepository', () => {
	let repository: IDistractionWhitelistRepository & FakeDistractionWhitelistRepository;

	beforeEach(() => {
		repository = new FakeDistractionWhitelistRepository();
	});

	it('starts empty', async () => {
		await expect(repository.getSilenced(TODAY)).resolves.toEqual([]);
	});

	it('silences rules for the day and returns them', async () => {
		await repository.silence('rule-1', TODAY);
		await repository.silence('rule-2', TODAY);

		await expect(repository.getSilenced(TODAY)).resolves.toEqual(['rule-1', 'rule-2']);
	});

	it('does not duplicate the same rule for the same day', async () => {
		await repository.silence('rule-1', TODAY);
		await repository.silence('rule-1', TODAY);

		await expect(repository.getSilenced(TODAY)).resolves.toEqual(['rule-1']);
	});

	it('keeps a single day at a time, like the persisted envelope', async () => {
		await repository.silence('rule-1', TODAY);
		await repository.silence('rule-2', TOMORROW);

		await expect(repository.getSilenced(TOMORROW)).resolves.toEqual(['rule-2']);
	});

	it('treats a different day as stale and purges it, mirroring the adapter', async () => {
		await repository.silence('rule-1', TODAY);

		await expect(repository.getSilenced(TOMORROW)).resolves.toEqual([]);
		await expect(repository.getSilenced(TODAY)).resolves.toEqual([]);
	});

	it('normalizes the date key and the rule id like the adapter', async () => {
		await repository.silence('  rule-1  ', ` ${TODAY} `);

		await expect(repository.getSilenced(TODAY)).resolves.toEqual(['rule-1']);
	});

	it('does not purge the day when the date key is padded, like the adapter', async () => {
		await repository.silence('rule-1', TODAY);

		await expect(repository.getSilenced(` ${TODAY} `)).resolves.toEqual(['rule-1']);
		await expect(repository.getSilenced(TODAY)).resolves.toEqual(['rule-1']);
	});

	it('ignores empty or blank input without storing anything, like the adapter', async () => {
		await repository.silence('   ', TODAY);
		await repository.silence('rule-1', '');
		await repository.silence('rule-2', '   ');

		await expect(repository.getSilenced('   ')).resolves.toEqual([]);
		await expect(repository.getSilenced('')).resolves.toEqual([]);
		await expect(repository.getSilenced(TODAY)).resolves.toEqual([]);
	});

	it('lifts a silence with a padded rule id or date key, like the adapter', async () => {
		await repository.silence('rule-1', TODAY);
		await repository.unsilence('  rule-1  ', TODAY);
		await expect(repository.getSilenced(TODAY)).resolves.toEqual([]);

		await repository.silence('rule-2', TODAY);
		await repository.unsilence('rule-2', ` ${TODAY} `);
		await expect(repository.getSilenced(TODAY)).resolves.toEqual([]);
	});

	it('lifts the silence of a single rule and keeps the rest', async () => {
		await repository.silence('rule-1', TODAY);
		await repository.silence('rule-2', TODAY);

		await repository.unsilence('rule-1', TODAY);

		await expect(repository.getSilenced(TODAY)).resolves.toEqual(['rule-2']);
		expect(repository.unsilenceCalls).toEqual([{ ruleId: 'rule-1', dateKey: TODAY }]);
	});

	it('is a no-op when lifting a silence for another day', async () => {
		await repository.silence('rule-1', TODAY);

		await repository.unsilence('rule-1', TOMORROW);

		await expect(repository.getSilenced(TODAY)).resolves.toEqual(['rule-1']);
	});

	it('clears all silences and records the calls it received', async () => {
		await repository.silence('rule-1', TODAY);
		await repository.clearAll();

		await expect(repository.getSilenced(TODAY)).resolves.toEqual([]);
		expect(repository.silenceCalls).toEqual([{ ruleId: 'rule-1', dateKey: TODAY }]);
		expect(repository.clearAllCalls).toBe(1);
	});

	it('returns a frozen collection', async () => {
		await repository.silence('rule-1', TODAY);

		expect(Object.isFrozen(await repository.getSilenced(TODAY))).toBe(true);
	});
});
