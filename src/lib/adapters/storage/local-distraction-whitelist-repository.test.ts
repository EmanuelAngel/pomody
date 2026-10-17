import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	LocalStorageDistractionWhitelistRepository,
	sanitizeRuleIds,
	DISTRACTION_WHITELIST_STORAGE_KEY,
	DISTRACTION_WHITELIST_STORAGE_VERSION
} from './local-distraction-whitelist-repository';

const TODAY = '2026-10-16';
const TOMORROW = '2026-10-17';
const YESTERDAY = '2026-10-15';

function createMockStorage(initialData: Record<string, string> = {}): Storage {
	const map = new Map<string, string>(Object.entries(initialData));

	return {
		get length(): number {
			return map.size;
		},
		clear(): void {
			map.clear();
		},
		getItem(key: string): string | null {
			return map.get(key) ?? null;
		},
		key(index: number): string | null {
			return Array.from(map.keys())[index] ?? null;
		},
		removeItem(key: string): void {
			map.delete(key);
		},
		setItem(key: string, value: string): void {
			map.set(key, String(value));
		}
	};
}

function storeEnvelope(storage: Storage, envelope: unknown): void {
	storage.setItem(DISTRACTION_WHITELIST_STORAGE_KEY, JSON.stringify(envelope));
}

describe('LocalStorageDistractionWhitelistRepository', () => {
	let mockStorage: Storage;
	let repository: LocalStorageDistractionWhitelistRepository;

	beforeEach(() => {
		mockStorage = createMockStorage();
		repository = new LocalStorageDistractionWhitelistRepository(mockStorage);
	});

	describe('sanitizeRuleIds', () => {
		it('keeps unique, trimmed, non-empty string ids in order', () => {
			expect(sanitizeRuleIds(['  a  ', 'b', 'a', '', '   ', 3, null, 'c'])).toEqual([
				'a',
				'b',
				'c'
			]);
		});

		it('returns an empty list for a non-array input', () => {
			expect(sanitizeRuleIds('nope')).toEqual([]);
			expect(sanitizeRuleIds(null)).toEqual([]);
			expect(sanitizeRuleIds(undefined)).toEqual([]);
		});
	});

	describe('getSilenced', () => {
		it('returns an empty list when nothing is stored', async () => {
			await expect(repository.getSilenced(TODAY)).resolves.toEqual([]);
		});

		it('returns the silenced rules for the stored date', async () => {
			storeEnvelope(mockStorage, {
				version: DISTRACTION_WHITELIST_STORAGE_VERSION,
				silencedUntil: TODAY,
				ruleIds: ['rule-1', 'rule-2']
			});

			await expect(repository.getSilenced(TODAY)).resolves.toEqual(['rule-1', 'rule-2']);
		});

		it('purges a stale date, returning an empty list and clearing the key', async () => {
			storeEnvelope(mockStorage, {
				version: DISTRACTION_WHITELIST_STORAGE_VERSION,
				silencedUntil: YESTERDAY,
				ruleIds: ['rule-1']
			});

			await expect(repository.getSilenced(TODAY)).resolves.toEqual([]);
			expect(mockStorage.getItem(DISTRACTION_WHITELIST_STORAGE_KEY)).toBeNull();
		});

		it('purges only when the day changes, not for a repeated read on the same day', async () => {
			await repository.silence('rule-1', TODAY);

			await repository.getSilenced(TODAY);
			await repository.getSilenced(TODAY);

			await expect(repository.getSilenced(TODAY)).resolves.toEqual(['rule-1']);
		});

		it('returns an empty list for malformed JSON', async () => {
			mockStorage.setItem(DISTRACTION_WHITELIST_STORAGE_KEY, 'not-valid-{json');

			await expect(repository.getSilenced(TODAY)).resolves.toEqual([]);
		});

		it('returns an empty list and keeps the payload on a version mismatch', async () => {
			const newer = JSON.stringify({
				version: DISTRACTION_WHITELIST_STORAGE_VERSION + 1,
				silencedUntil: TODAY,
				ruleIds: ['rule-1']
			});
			mockStorage.setItem(DISTRACTION_WHITELIST_STORAGE_KEY, newer);

			await expect(repository.getSilenced(TODAY)).resolves.toEqual([]);
			expect(mockStorage.getItem(DISTRACTION_WHITELIST_STORAGE_KEY)).toBe(newer);
		});

		it('returns an empty list when ruleIds is not an array', async () => {
			storeEnvelope(mockStorage, {
				version: DISTRACTION_WHITELIST_STORAGE_VERSION,
				silencedUntil: TODAY,
				ruleIds: 'rule-1'
			});

			await expect(repository.getSilenced(TODAY)).resolves.toEqual([]);
		});

		it('filters corrupt ids out of a partially valid list', async () => {
			storeEnvelope(mockStorage, {
				version: DISTRACTION_WHITELIST_STORAGE_VERSION,
				silencedUntil: TODAY,
				ruleIds: ['rule-1', 5, '  ', 'rule-2']
			});

			await expect(repository.getSilenced(TODAY)).resolves.toEqual(['rule-1', 'rule-2']);
		});

		it('returns a frozen collection', async () => {
			await repository.silence('rule-1', TODAY);

			expect(Object.isFrozen(await repository.getSilenced(TODAY))).toBe(true);
		});
	});

	describe('silence', () => {
		it('silences a rule for the given date inside a versioned envelope', async () => {
			await repository.silence('rule-1', TODAY);

			const envelope = JSON.parse(mockStorage.getItem(DISTRACTION_WHITELIST_STORAGE_KEY)!);
			expect(envelope).toEqual({
				version: DISTRACTION_WHITELIST_STORAGE_VERSION,
				silencedUntil: TODAY,
				ruleIds: ['rule-1']
			});
			await expect(repository.getSilenced(TODAY)).resolves.toEqual(['rule-1']);
		});

		it('accumulates several rules for the same date', async () => {
			await repository.silence('rule-1', TODAY);
			await repository.silence('rule-2', TODAY);

			await expect(repository.getSilenced(TODAY)).resolves.toEqual(['rule-1', 'rule-2']);
		});

		it('does not duplicate the same rule for the same date', async () => {
			await repository.silence('rule-1', TODAY);
			await repository.silence('rule-1', TODAY);

			await expect(repository.getSilenced(TODAY)).resolves.toEqual(['rule-1']);
		});

		it('starts a fresh list when the date changes', async () => {
			await repository.silence('rule-1', TODAY);
			await repository.silence('rule-2', TOMORROW);

			const envelope = JSON.parse(mockStorage.getItem(DISTRACTION_WHITELIST_STORAGE_KEY)!);
			expect(envelope.silencedUntil).toBe(TOMORROW);
			expect(envelope.ruleIds).toEqual(['rule-2']);
		});

		it('ignores an empty rule id or an empty date key', async () => {
			await repository.silence('   ', TODAY);
			await repository.silence('rule-1', '');

			expect(mockStorage.getItem(DISTRACTION_WHITELIST_STORAGE_KEY)).toBeNull();
		});
	});

	describe('clearAll', () => {
		it('removes the whitelist key without touching other storage keys', async () => {
			mockStorage.setItem('pomody:settings', '{"version":1}');
			await repository.silence('rule-1', TODAY);

			await repository.clearAll();

			expect(mockStorage.getItem(DISTRACTION_WHITELIST_STORAGE_KEY)).toBeNull();
			expect(mockStorage.getItem('pomody:settings')).toBe('{"version":1}');
		});
	});

	describe('SSR and storage exceptions', () => {
		it('returns an empty list and never throws when storage is unavailable', async () => {
			const ssrRepository = new LocalStorageDistractionWhitelistRepository(undefined);

			await expect(ssrRepository.getSilenced(TODAY)).resolves.toEqual([]);
			await expect(ssrRepository.silence('rule-1', TODAY)).resolves.toBeUndefined();
			await expect(ssrRepository.clearAll()).resolves.toBeUndefined();
		});

		it('handles a SecurityError on getItem gracefully', async () => {
			const throwingStorage: Storage = {
				...mockStorage,
				getItem: vi.fn().mockImplementation(() => {
					throw new DOMException('The operation is insecure.', 'SecurityError');
				})
			};

			await expect(
				new LocalStorageDistractionWhitelistRepository(throwingStorage).getSilenced(TODAY)
			).resolves.toEqual([]);
		});

		it('handles a QuotaExceededError on setItem gracefully', async () => {
			const throwingStorage: Storage = {
				...mockStorage,
				setItem: vi.fn().mockImplementation(() => {
					throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
				})
			};

			await expect(
				new LocalStorageDistractionWhitelistRepository(throwingStorage).silence('rule-1', TODAY)
			).resolves.toBeUndefined();
		});

		it('handles a SecurityError on removeItem gracefully', async () => {
			const throwingStorage: Storage = {
				...mockStorage,
				removeItem: vi.fn().mockImplementation(() => {
					throw new DOMException('The operation is insecure.', 'SecurityError');
				})
			};

			await expect(
				new LocalStorageDistractionWhitelistRepository(throwingStorage).clearAll()
			).resolves.toBeUndefined();
		});
	});

	describe('newer envelope version', () => {
		it('aborts writes when storage holds a newer envelope version', async () => {
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const newer = JSON.stringify({
				version: DISTRACTION_WHITELIST_STORAGE_VERSION + 1,
				silencedUntil: TODAY,
				ruleIds: []
			});
			mockStorage.setItem(DISTRACTION_WHITELIST_STORAGE_KEY, newer);

			await repository.silence('rule-1', TODAY);

			expect(mockStorage.getItem(DISTRACTION_WHITELIST_STORAGE_KEY)).toBe(newer);
			expect(warnSpy).toHaveBeenCalled();
			warnSpy.mockRestore();
		});

		it('does not purge a newer envelope version while reading', async () => {
			const newer = JSON.stringify({
				version: DISTRACTION_WHITELIST_STORAGE_VERSION + 1,
				silencedUntil: YESTERDAY,
				ruleIds: ['rule-1']
			});
			mockStorage.setItem(DISTRACTION_WHITELIST_STORAGE_KEY, newer);

			await repository.getSilenced(TODAY);

			expect(mockStorage.getItem(DISTRACTION_WHITELIST_STORAGE_KEY)).toBe(newer);
		});
	});
});
