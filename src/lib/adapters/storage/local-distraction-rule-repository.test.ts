import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	LocalStorageDistractionRuleRepository,
	DISTRACTION_RULES_STORAGE_KEY,
	DISTRACTION_RULES_STORAGE_VERSION,
	type StoredDistractionRulesEnvelope
} from './local-distraction-rule-repository';
import { InMemoryStorage } from './in-memory-storage';
import {
	type DistractionRule,
	sanitizeDistractionRule
} from '../../domain/distraction/distraction-rule.entity';

const UNRELATED_STORAGE_KEY = 'pomody:settings';

function createRule(overrides: Partial<DistractionRule> = {}): DistractionRule {
	return {
		id: 'rule-1',
		exe: 'chrome',
		createdAt: 1_700_000_000_000,
		...overrides
	};
}

function storeEnvelope(storage: Storage, envelope: unknown): void {
	storage.setItem(DISTRACTION_RULES_STORAGE_KEY, JSON.stringify(envelope));
}

describe('LocalStorageDistractionRuleRepository', () => {
	let mockStorage: Storage;
	let repository: LocalStorageDistractionRuleRepository;

	beforeEach(() => {
		mockStorage = new InMemoryStorage();
		repository = new LocalStorageDistractionRuleRepository(mockStorage);
	});

	describe('sanitizeDistractionRule', () => {
		it('returns a frozen rule from valid input', () => {
			const sanitized = sanitizeDistractionRule(createRule());

			expect(sanitized).toEqual(createRule());
			expect(Object.isFrozen(sanitized)).toBe(true);
		});

		it('normalizes the stored executable to lowercase without path or extension', () => {
			const sanitized = sanitizeDistractionRule(
				createRule({ exe: 'C:\\Program Files\\Google\\Chrome\\CHROME.EXE' })
			);

			expect(sanitized?.exe).toBe('chrome');
		});

		it('trims the id', () => {
			expect(sanitizeDistractionRule(createRule({ id: '  rule-1  ' }))?.id).toBe('rule-1');
		});

		it('keeps a trimmed title pattern when present', () => {
			expect(
				sanitizeDistractionRule(createRule({ titlePattern: '  YouTube  ' }))?.titlePattern
			).toBe('YouTube');
		});

		it('drops an empty or whitespace-only title pattern', () => {
			expect(
				sanitizeDistractionRule(createRule({ titlePattern: '' }))?.titlePattern
			).toBeUndefined();
			expect(
				sanitizeDistractionRule(createRule({ titlePattern: '   ' }))?.titlePattern
			).toBeUndefined();
		});

		it('rejects rules with a missing, empty or non-string id', () => {
			expect(sanitizeDistractionRule(createRule({ id: '' }))).toBeNull();
			expect(sanitizeDistractionRule(createRule({ id: '   ' }))).toBeNull();
			expect(sanitizeDistractionRule({ exe: 'chrome', createdAt: 1 })).toBeNull();
			expect(sanitizeDistractionRule(createRule({ id: 42 as unknown as string }))).toBeNull();
		});

		it('rejects rules whose executable normalizes to an empty string', () => {
			expect(sanitizeDistractionRule(createRule({ exe: '.exe' }))).toBeNull();
			expect(sanitizeDistractionRule(createRule({ exe: '   ' }))).toBeNull();
			expect(sanitizeDistractionRule(createRule({ exe: '/usr/bin/' }))).toBeNull();
		});

		it('rejects a non-string title pattern', () => {
			expect(
				sanitizeDistractionRule(createRule({ titlePattern: 7 as unknown as string }))
			).toBeNull();
		});

		it('rejects a non-finite or non-positive createdAt', () => {
			expect(sanitizeDistractionRule(createRule({ createdAt: 0 }))).toBeNull();
			expect(sanitizeDistractionRule(createRule({ createdAt: -1 }))).toBeNull();
			expect(sanitizeDistractionRule(createRule({ createdAt: Number.NaN }))).toBeNull();
			expect(
				sanitizeDistractionRule(createRule({ createdAt: 'x' as unknown as number }))
			).toBeNull();
		});

		it('rejects primitives and null', () => {
			expect(sanitizeDistractionRule(null)).toBeNull();
			expect(sanitizeDistractionRule('rule')).toBeNull();
			expect(sanitizeDistractionRule(3)).toBeNull();
		});
	});

	describe('getAll', () => {
		it('returns an empty list when nothing is stored', async () => {
			await expect(repository.getAll()).resolves.toEqual([]);
		});

		it('returns an empty list when the stored payload is malformed JSON', async () => {
			mockStorage.setItem(DISTRACTION_RULES_STORAGE_KEY, 'not-valid-{json');

			await expect(repository.getAll()).resolves.toEqual([]);
		});

		it('returns an empty list when the payload is not an object', async () => {
			storeEnvelope(mockStorage, [1, 2, 3]);

			await expect(repository.getAll()).resolves.toEqual([]);
		});

		it('returns an empty list on an envelope version mismatch', async () => {
			storeEnvelope(mockStorage, { version: 99, rules: [createRule()] });

			await expect(repository.getAll()).resolves.toEqual([]);
		});

		it('returns an empty list when the rules field is not an array', async () => {
			storeEnvelope(mockStorage, { version: DISTRACTION_RULES_STORAGE_VERSION, rules: 'nope' });

			await expect(repository.getAll()).resolves.toEqual([]);
		});

		it('treats an empty rules array as a valid state, not as corruption', async () => {
			storeEnvelope(mockStorage, {
				version: DISTRACTION_RULES_STORAGE_VERSION,
				rules: []
			});

			await expect(repository.getAll()).resolves.toEqual([]);
			expect(mockStorage.getItem(DISTRACTION_RULES_STORAGE_KEY)).not.toBeNull();
		});

		it('skips corrupt entries and keeps the valid ones', async () => {
			storeEnvelope(mockStorage, {
				version: DISTRACTION_RULES_STORAGE_VERSION,
				rules: [createRule({ id: 'a' }), { id: '' }, null, createRule({ id: 'b', exe: 'steam' })]
			});

			const rules = await repository.getAll();

			expect(rules.map((rule) => rule.id)).toEqual(['a', 'b']);
			expect(rules[1].exe).toBe('steam');
		});

		it('normalizes stored executables when reading', async () => {
			storeEnvelope(mockStorage, {
				version: DISTRACTION_RULES_STORAGE_VERSION,
				rules: [createRule({ exe: 'Chrome.EXE' })]
			});

			await expect(repository.getAll()).resolves.toEqual([createRule({ exe: 'chrome' })]);
		});

		it('returns a frozen collection', async () => {
			await repository.save(createRule());

			const rules = await repository.getAll();
			expect(Object.isFrozen(rules)).toBe(true);
		});
	});

	describe('save', () => {
		it('persists a rule inside a versioned envelope', async () => {
			await repository.save(createRule({ titlePattern: 'YouTube' }));

			const raw = mockStorage.getItem(DISTRACTION_RULES_STORAGE_KEY);
			expect(raw).not.toBeNull();

			const envelope: StoredDistractionRulesEnvelope = JSON.parse(raw!);
			expect(envelope.version).toBe(DISTRACTION_RULES_STORAGE_VERSION);
			expect(envelope.rules).toEqual([createRule({ titlePattern: 'YouTube' })]);
		});

		it('stores the normalized executable', async () => {
			await repository.save(createRule({ exe: 'C:\\Steam\\STEAM.EXE' }));

			const envelope: StoredDistractionRulesEnvelope = JSON.parse(
				mockStorage.getItem(DISTRACTION_RULES_STORAGE_KEY)!
			);
			expect(envelope.rules[0].exe).toBe('steam');
		});

		it('upserts an existing rule by id instead of appending a duplicate', async () => {
			await repository.save(createRule({ exe: 'chrome' }));
			await repository.save(createRule({ exe: 'steam' }));

			const rules = await repository.getAll();
			expect(rules).toHaveLength(1);
			expect(rules[0].exe).toBe('steam');
		});

		it('appends distinct rules preserving insertion order', async () => {
			await repository.save(createRule({ id: 'first' }));
			await repository.save(createRule({ id: 'second' }));

			await expect(repository.getAll()).resolves.toEqual([
				createRule({ id: 'first' }),
				createRule({ id: 'second' })
			]);
		});

		it('ignores a rule that cannot be sanitized', async () => {
			await repository.save(createRule({ id: '' }));

			expect(mockStorage.getItem(DISTRACTION_RULES_STORAGE_KEY)).toBeNull();
			await expect(repository.getAll()).resolves.toEqual([]);
		});

		it('does not persist any window title beyond the declared pattern', async () => {
			await repository.save(createRule({ titlePattern: 'YouTube' }));

			const raw = mockStorage.getItem(DISTRACTION_RULES_STORAGE_KEY)!;
			expect(Object.keys(JSON.parse(raw).rules[0]).sort()).toEqual([
				'createdAt',
				'exe',
				'id',
				'titlePattern'
			]);
		});
	});

	describe('delete', () => {
		it('removes a rule by id and keeps the rest', async () => {
			await repository.save(createRule({ id: 'a' }));
			await repository.save(createRule({ id: 'b' }));

			await repository.delete('a');

			await expect(repository.getAll()).resolves.toEqual([createRule({ id: 'b' })]);
		});

		it('leaves a valid empty envelope once the last rule is deleted', async () => {
			await repository.save(createRule());
			await repository.delete('rule-1');

			await expect(repository.getAll()).resolves.toEqual([]);
			const envelope: StoredDistractionRulesEnvelope = JSON.parse(
				mockStorage.getItem(DISTRACTION_RULES_STORAGE_KEY)!
			);
			expect(envelope.rules).toEqual([]);
		});

		it('is a no-op for an unknown id', async () => {
			await repository.save(createRule());

			await repository.delete('does-not-exist');

			await expect(repository.getAll()).resolves.toEqual([createRule()]);
		});

		it('does not create the key when there is nothing to remove', async () => {
			await repository.delete('does-not-exist');

			expect(mockStorage.getItem(DISTRACTION_RULES_STORAGE_KEY)).toBeNull();
		});
	});

	describe('clearAll', () => {
		it('removes the rules key without touching other storage keys', async () => {
			mockStorage.setItem(UNRELATED_STORAGE_KEY, '{"version":1}');
			await repository.save(createRule());

			await repository.clearAll();

			expect(mockStorage.getItem(DISTRACTION_RULES_STORAGE_KEY)).toBeNull();
			expect(mockStorage.getItem(UNRELATED_STORAGE_KEY)).toBe('{"version":1}');
		});
	});

	describe('SSR and storage exceptions', () => {
		it('returns an empty list and never throws when storage is unavailable', async () => {
			const ssrRepository = new LocalStorageDistractionRuleRepository(undefined);

			await expect(ssrRepository.getAll()).resolves.toEqual([]);
			await expect(ssrRepository.save(createRule())).resolves.toBeUndefined();
			await expect(ssrRepository.delete('rule-1')).resolves.toBeUndefined();
			await expect(ssrRepository.clearAll()).resolves.toBeUndefined();
		});

		it('handles a SecurityError on getItem gracefully', async () => {
			const throwingStorage = new InMemoryStorage();
			vi.spyOn(throwingStorage, 'getItem').mockImplementation(() => {
				throw new DOMException('The operation is insecure.', 'SecurityError');
			});

			await expect(
				new LocalStorageDistractionRuleRepository(throwingStorage).getAll()
			).resolves.toEqual([]);
		});

		it('handles a QuotaExceededError on setItem gracefully', async () => {
			const throwingStorage = new InMemoryStorage();
			vi.spyOn(throwingStorage, 'setItem').mockImplementation(() => {
				throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
			});

			await expect(
				new LocalStorageDistractionRuleRepository(throwingStorage).save(createRule())
			).resolves.toBeUndefined();
		});

		it('handles a SecurityError on removeItem gracefully', async () => {
			const throwingStorage = new InMemoryStorage();
			vi.spyOn(throwingStorage, 'removeItem').mockImplementation(() => {
				throw new DOMException('The operation is insecure.', 'SecurityError');
			});

			await expect(
				new LocalStorageDistractionRuleRepository(throwingStorage).clearAll()
			).resolves.toBeUndefined();
		});
	});

	describe('newer envelope version', () => {
		it('aborts writes when storage holds a newer envelope version', async () => {
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const newer = JSON.stringify({ version: DISTRACTION_RULES_STORAGE_VERSION + 1, rules: [] });
			mockStorage.setItem(DISTRACTION_RULES_STORAGE_KEY, newer);

			await repository.save(createRule());

			expect(mockStorage.getItem(DISTRACTION_RULES_STORAGE_KEY)).toBe(newer);
			expect(warnSpy).toHaveBeenCalled();
			warnSpy.mockRestore();
		});
	});
});
