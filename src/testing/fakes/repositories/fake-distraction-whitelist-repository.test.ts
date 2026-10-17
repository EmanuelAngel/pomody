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
