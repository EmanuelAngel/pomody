import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	LocalStorageBreakActivityRepository,
	sanitizeBreakActivity,
	BREAK_ACTIVITIES_STORAGE_KEY,
	BREAK_ACTIVITIES_STORAGE_VERSION,
	type StoredBreakActivitiesEnvelope
} from './local-break-activity-repository';
import {
	createBreakActivity,
	PRESET_BREAK_ACTIVITIES,
	type BreakActivity
} from '../../domain/breaks/break-activity.entity';
import { sortBreakActivities } from '../../domain/ports/break-activity-repository.port';

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

describe('LocalStorageBreakActivityRepository', () => {
	let mockStorage: Storage;
	let repository: LocalStorageBreakActivityRepository;

	beforeEach(() => {
		mockStorage = createMockStorage();
		repository = new LocalStorageBreakActivityRepository(mockStorage);
	});

	describe('sanitizeBreakActivity', () => {
		it('returns a frozen BreakActivity for valid input without guide', () => {
			const raw = {
				id: 'break-1',
				title: '  Neck Stretch  ',
				category: 'physical',
				durationMinutes: 3,
				isPreset: false
			};

			const sanitized = sanitizeBreakActivity(raw);
			expect(sanitized).not.toBeNull();
			expect(sanitized).toEqual({
				id: 'break-1',
				title: 'Neck Stretch',
				category: 'physical',
				durationMinutes: 3,
				isPreset: false
			});
			expect(Object.isFrozen(sanitized)).toBe(true);
		});

		it('preserves valid guide and trims whitespace', () => {
			const raw = {
				id: 'break-2',
				title: 'Box Breathing',
				category: 'mindful',
				durationMinutes: 4,
				isPreset: true,
				guide: '  1. Inhale for 4s.\n2. Exhale for 4s.  '
			};

			const sanitized = sanitizeBreakActivity(raw);
			expect(sanitized).not.toBeNull();
			expect(sanitized?.guide).toBe('1. Inhale for 4s.\n2. Exhale for 4s.');
		});

		it('omits guide if empty string or whitespace-only', () => {
			const raw = {
				id: 'break-3',
				title: 'Water Break',
				category: 'hydration',
				durationMinutes: 1,
				isPreset: false,
				guide: '   '
			};

			const sanitized = sanitizeBreakActivity(raw);
			expect(sanitized).not.toBeNull();
			expect(sanitized?.guide).toBeUndefined();
		});

		it('returns null if input is not an object or null', () => {
			expect(sanitizeBreakActivity(null)).toBeNull();
			expect(sanitizeBreakActivity(undefined)).toBeNull();
			expect(sanitizeBreakActivity('string')).toBeNull();
			expect(sanitizeBreakActivity(123)).toBeNull();
			expect(sanitizeBreakActivity(true)).toBeNull();
		});

		it('returns null if id is invalid (missing, non-string, empty, or whitespace-only)', () => {
			expect(
				sanitizeBreakActivity({
					title: 'Title',
					category: 'physical',
					durationMinutes: 2,
					isPreset: false
				})
			).toBeNull();
			expect(
				sanitizeBreakActivity({
					id: 123,
					title: 'Title',
					category: 'physical',
					durationMinutes: 2,
					isPreset: false
				})
			).toBeNull();
			expect(
				sanitizeBreakActivity({
					id: '',
					title: 'Title',
					category: 'physical',
					durationMinutes: 2,
					isPreset: false
				})
			).toBeNull();
			expect(
				sanitizeBreakActivity({
					id: '   ',
					title: 'Title',
					category: 'physical',
					durationMinutes: 2,
					isPreset: false
				})
			).toBeNull();
		});

		it('returns null if title is invalid (non-string, empty, whitespace-only, or > 120 chars)', () => {
			expect(
				sanitizeBreakActivity({
					id: 'b1',
					title: 123,
					category: 'physical',
					durationMinutes: 2,
					isPreset: false
				})
			).toBeNull();
			expect(
				sanitizeBreakActivity({
					id: 'b1',
					title: '',
					category: 'physical',
					durationMinutes: 2,
					isPreset: false
				})
			).toBeNull();
			expect(
				sanitizeBreakActivity({
					id: 'b1',
					title: '   ',
					category: 'physical',
					durationMinutes: 2,
					isPreset: false
				})
			).toBeNull();
			expect(
				sanitizeBreakActivity({
					id: 'b1',
					title: 'a'.repeat(121),
					category: 'physical',
					durationMinutes: 2,
					isPreset: false
				})
			).toBeNull();
		});

		it('accepts title up to 120 characters', () => {
			const maxTitle = 'a'.repeat(120);
			const sanitized = sanitizeBreakActivity({
				id: 'b1',
				title: maxTitle,
				category: 'physical',
				durationMinutes: 2,
				isPreset: false
			});
			expect(sanitized).not.toBeNull();
			expect(sanitized?.title).toBe(maxTitle);
		});

		it('returns null if category is invalid', () => {
			expect(
				sanitizeBreakActivity({
					id: 'b1',
					title: 'Title',
					category: 'invalid-cat',
					durationMinutes: 2,
					isPreset: false
				})
			).toBeNull();
			expect(
				sanitizeBreakActivity({
					id: 'b1',
					title: 'Title',
					category: 123,
					durationMinutes: 2,
					isPreset: false
				})
			).toBeNull();
		});

		it('accepts all valid categories', () => {
			for (const cat of ['physical', 'mindful', 'hydration']) {
				const sanitized = sanitizeBreakActivity({
					id: 'b1',
					title: 'Title',
					category: cat,
					durationMinutes: 2,
					isPreset: false
				});
				expect(sanitized).not.toBeNull();
				expect(sanitized?.category).toBe(cat);
			}
		});

		it('returns null if durationMinutes is invalid (non-integer, < 1, non-number, NaN, Infinity)', () => {
			expect(
				sanitizeBreakActivity({
					id: 'b1',
					title: 'Title',
					category: 'physical',
					durationMinutes: 0,
					isPreset: false
				})
			).toBeNull();
			expect(
				sanitizeBreakActivity({
					id: 'b1',
					title: 'Title',
					category: 'physical',
					durationMinutes: -1,
					isPreset: false
				})
			).toBeNull();
			expect(
				sanitizeBreakActivity({
					id: 'b1',
					title: 'Title',
					category: 'physical',
					durationMinutes: 2.5,
					isPreset: false
				})
			).toBeNull();
			expect(
				sanitizeBreakActivity({
					id: 'b1',
					title: 'Title',
					category: 'physical',
					durationMinutes: '3',
					isPreset: false
				})
			).toBeNull();
			expect(
				sanitizeBreakActivity({
					id: 'b1',
					title: 'Title',
					category: 'physical',
					durationMinutes: NaN,
					isPreset: false
				})
			).toBeNull();
			expect(
				sanitizeBreakActivity({
					id: 'b1',
					title: 'Title',
					category: 'physical',
					durationMinutes: Infinity,
					isPreset: false
				})
			).toBeNull();
		});

		it('returns null if isPreset is not a boolean', () => {
			expect(
				sanitizeBreakActivity({
					id: 'b1',
					title: 'Title',
					category: 'physical',
					durationMinutes: 2,
					isPreset: 'true'
				})
			).toBeNull();
			expect(
				sanitizeBreakActivity({
					id: 'b1',
					title: 'Title',
					category: 'physical',
					durationMinutes: 2,
					isPreset: null
				})
			).toBeNull();
		});

		it('returns null if guide is present but invalid (> 500 chars or non-string)', () => {
			expect(
				sanitizeBreakActivity({
					id: 'b1',
					title: 'Title',
					category: 'physical',
					durationMinutes: 2,
					isPreset: false,
					guide: 123
				})
			).toBeNull();
			expect(
				sanitizeBreakActivity({
					id: 'b1',
					title: 'Title',
					category: 'physical',
					durationMinutes: 2,
					isPreset: false,
					guide: 'a'.repeat(501)
				})
			).toBeNull();
		});
	});

	describe('Default Seeding and Fallback', () => {
		it('seeds with 10 presets when storage is initially empty', async () => {
			expect(mockStorage.getItem(BREAK_ACTIVITIES_STORAGE_KEY)).toBeNull();

			const all = await repository.getAll();
			expect(all).toHaveLength(PRESET_BREAK_ACTIVITIES.length);
			expect(all).toEqual(sortBreakActivities(PRESET_BREAK_ACTIVITIES));

			// Envelope should now be written to storage
			const storedRaw = mockStorage.getItem(BREAK_ACTIVITIES_STORAGE_KEY);
			expect(storedRaw).not.toBeNull();
			const envelope: StoredBreakActivitiesEnvelope = JSON.parse(storedRaw!);
			expect(envelope.version).toBe(BREAK_ACTIVITIES_STORAGE_VERSION);
			expect(envelope.activities).toHaveLength(10);
		});

		it('seeds with 10 presets when stored payload is whitespace-only string', async () => {
			mockStorage.setItem(BREAK_ACTIVITIES_STORAGE_KEY, '   ');

			const all = await repository.getAll();
			expect(all).toHaveLength(10);
			expect(all).toEqual(sortBreakActivities(PRESET_BREAK_ACTIVITIES));
		});

		it('falls back to presets when stored payload is malformed JSON', async () => {
			mockStorage.setItem(BREAK_ACTIVITIES_STORAGE_KEY, '{invalid-json');

			const all = await repository.getAll();
			expect(all).toHaveLength(10);
			expect(all).toEqual(sortBreakActivities(PRESET_BREAK_ACTIVITIES));
		});

		it('falls back to presets when stored JSON is a primitive or null', async () => {
			mockStorage.setItem(BREAK_ACTIVITIES_STORAGE_KEY, 'null');
			expect(await repository.getAll()).toHaveLength(10);

			mockStorage.setItem(BREAK_ACTIVITIES_STORAGE_KEY, '"some string"');
			expect(await repository.getAll()).toHaveLength(10);

			mockStorage.setItem(BREAK_ACTIVITIES_STORAGE_KEY, '42');
			expect(await repository.getAll()).toHaveLength(10);
		});

		it('falls back to presets when envelope version is incompatible', async () => {
			mockStorage.setItem(
				BREAK_ACTIVITIES_STORAGE_KEY,
				JSON.stringify({
					version: 0,
					activities: []
				})
			);

			const all = await repository.getAll();
			expect(all).toHaveLength(10);
			expect(all).toEqual(sortBreakActivities(PRESET_BREAK_ACTIVITIES));
		});

		it('falls back to presets when envelope activities property is not an array', async () => {
			mockStorage.setItem(
				BREAK_ACTIVITIES_STORAGE_KEY,
				JSON.stringify({
					version: BREAK_ACTIVITIES_STORAGE_VERSION,
					activities: 'not-an-array'
				})
			);

			const all = await repository.getAll();
			expect(all).toHaveLength(10);
			expect(all).toEqual(sortBreakActivities(PRESET_BREAK_ACTIVITIES));
		});

		it('falls back to presets when envelope activities contains only corrupted items', async () => {
			mockStorage.setItem(
				BREAK_ACTIVITIES_STORAGE_KEY,
				JSON.stringify({
					version: BREAK_ACTIVITIES_STORAGE_VERSION,
					activities: [null, { bad: true }, { id: '', title: '' }]
				})
			);

			const all = await repository.getAll();
			expect(all).toHaveLength(10);
			expect(all).toEqual(sortBreakActivities(PRESET_BREAK_ACTIVITIES));
		});

		it('filters out corrupted activities in envelope and preserves valid ones', async () => {
			const validActivity = createBreakActivity({
				id: 'custom-valid-1',
				title: 'Valid Custom Break',
				category: 'mindful',
				durationMinutes: 2,
				isPreset: false
			});
			const corruptItem = { id: 123, title: 'Corrupt' };

			mockStorage.setItem(
				BREAK_ACTIVITIES_STORAGE_KEY,
				JSON.stringify({
					version: BREAK_ACTIVITIES_STORAGE_VERSION,
					activities: [validActivity, corruptItem]
				})
			);

			const all = await repository.getAll();
			expect(all).toHaveLength(1);
			expect(all[0].id).toBe('custom-valid-1');
		});
	});

	describe('Category Filtering & Querying', () => {
		it('returns all activities sorted deterministically and frozen', async () => {
			const all = await repository.getAll();
			expect(Object.isFrozen(all)).toBe(true);
			expect(all).toHaveLength(10);
		});

		it('getByCategory filters correctly for physical, mindful, and hydration', async () => {
			const physicals = await repository.getByCategory('physical');
			expect(physicals).toHaveLength(4);
			expect(physicals.every((a) => a.category === 'physical')).toBe(true);
			expect(Object.isFrozen(physicals)).toBe(true);

			const mindfuls = await repository.getByCategory('mindful');
			expect(mindfuls).toHaveLength(4);
			expect(mindfuls.every((a) => a.category === 'mindful')).toBe(true);

			const hydrations = await repository.getByCategory('hydration');
			expect(hydrations).toHaveLength(2);
			expect(hydrations.every((a) => a.category === 'hydration')).toBe(true);
		});
	});

	describe('Save and Upsert Operations', () => {
		it('saves a new custom break activity', async () => {
			const custom = createBreakActivity({
				id: 'custom-yoga',
				title: 'Desk Yoga Flow',
				category: 'physical',
				durationMinutes: 5,
				isPreset: false,
				guide: '1. Upward dog.\n2. Child pose.'
			});

			await repository.save(custom);

			const all = await repository.getAll();
			expect(all).toHaveLength(11);
			const found = all.find((a) => a.id === 'custom-yoga');
			expect(found).toEqual(custom);
		});

		it('updates an existing break activity by id', async () => {
			const original = (await repository.getAll())[0];
			const updated: BreakActivity = {
				...original,
				title: 'Updated Title Stretch',
				durationMinutes: 5
			};

			await repository.save(updated);

			const all = await repository.getAll();
			expect(all).toHaveLength(10);
			const found = all.find((a) => a.id === original.id);
			expect(found?.title).toBe('Updated Title Stretch');
			expect(found?.durationMinutes).toBe(5);
		});

		it('ignores saving invalid activities passed directly to save()', async () => {
			const invalid = {
				id: '',
				title: '',
				category: 'physical',
				durationMinutes: 1,
				isPreset: false
			} as unknown as BreakActivity;

			await repository.save(invalid);

			const all = await repository.getAll();
			expect(all).toHaveLength(10);
		});
	});

	describe('Delete Operations', () => {
		it('deletes an activity by id', async () => {
			const presets = await repository.getAll();
			const toDelete = presets[0].id;

			await repository.delete(toDelete);

			const all = await repository.getAll();
			expect(all).toHaveLength(9);
			expect(all.some((a) => a.id === toDelete)).toBe(false);
		});

		it('handles deleting a non-existent id gracefully without error', async () => {
			await repository.delete('non-existent-activity-id');

			const all = await repository.getAll();
			expect(all).toHaveLength(10);
		});
	});

	describe('resetToDefaults', () => {
		it('restores the catalog to the initial 10 PRESET_BREAK_ACTIVITIES', async () => {
			// Mutate state: delete one preset, add custom
			const presets = await repository.getAll();
			await repository.delete(presets[0].id);

			const custom = createBreakActivity({
				id: 'custom-temp',
				title: 'Temp Habit',
				category: 'hydration',
				durationMinutes: 1,
				isPreset: false
			});
			await repository.save(custom);

			const modified = await repository.getAll();
			expect(modified).toHaveLength(10);
			expect(modified.some((a) => a.id === 'custom-temp')).toBe(true);

			// Now reset
			await repository.resetToDefaults();

			const restored = await repository.getAll();
			expect(restored).toHaveLength(10);
			expect(restored.some((a) => a.id === 'custom-temp')).toBe(false);
			expect(restored).toEqual(sortBreakActivities(PRESET_BREAK_ACTIVITIES));
		});
	});

	describe('clearAll', () => {
		it('removes break activities key without touching other keys such as pomody:settings', async () => {
			mockStorage.setItem('pomody:settings', JSON.stringify({ version: 1, theme: 'dawn' }));

			// Trigger seeding
			await repository.getAll();
			expect(mockStorage.getItem(BREAK_ACTIVITIES_STORAGE_KEY)).not.toBeNull();
			expect(mockStorage.getItem('pomody:settings')).not.toBeNull();

			await repository.clearAll();

			expect(mockStorage.getItem(BREAK_ACTIVITIES_STORAGE_KEY)).toBeNull();
			expect(mockStorage.getItem('pomody:settings')).toBe(
				JSON.stringify({ version: 1, theme: 'dawn' })
			);
		});
	});

	describe('Defensive Exception Handling & Resilience', () => {
		it('handles SSR / Node environment where window and localStorage are undefined', async () => {
			const ssrRepo = new LocalStorageBreakActivityRepository(undefined);

			expect(ssrRepo.getStorage()).toBeNull();
			const all = await ssrRepo.getAll();
			expect(all).toHaveLength(10);
			expect(await ssrRepo.getByCategory('physical')).toHaveLength(4);

			const act = createBreakActivity({ id: 'ssr-1', title: 'SSR Act', category: 'mindful' });
			await expect(ssrRepo.save(act)).resolves.not.toThrow();
			await expect(ssrRepo.delete('ssr-1')).resolves.not.toThrow();
			await expect(ssrRepo.resetToDefaults()).resolves.not.toThrow();
			await expect(ssrRepo.clearAll()).resolves.not.toThrow();
		});

		it('handles SecurityError on getItem gracefully without throwing', async () => {
			const throwingStorage: Storage = {
				...mockStorage,
				getItem: vi.fn().mockImplementation(() => {
					throw new DOMException('The operation is insecure.', 'SecurityError');
				})
			};

			const repo = new LocalStorageBreakActivityRepository(throwingStorage);
			const all = await repo.getAll();
			expect(all).toHaveLength(10);
		});

		it('handles SecurityError on removeItem gracefully without throwing', async () => {
			const throwingStorage: Storage = {
				...mockStorage,
				removeItem: vi.fn().mockImplementation(() => {
					throw new DOMException('The operation is insecure.', 'SecurityError');
				})
			};

			const repo = new LocalStorageBreakActivityRepository(throwingStorage);
			await expect(repo.clearAll()).resolves.not.toThrow();
		});

		it('handles QuotaExceededError on setItem gracefully and logs error', async () => {
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			const quotaError = new DOMException('The quota has been exceeded.', 'QuotaExceededError');
			const throwingStorage: Storage = {
				...mockStorage,
				setItem: vi.fn().mockImplementation(() => {
					throw quotaError;
				})
			};

			const repo = new LocalStorageBreakActivityRepository(throwingStorage);
			const act = createBreakActivity({ id: 'act-1', title: 'Test', category: 'physical' });

			await expect(repo.save(act)).resolves.not.toThrow();
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'Failed to write break activities to storage:',
				quotaError
			);

			consoleErrorSpy.mockRestore();
		});

		it('returns null if accessing window.localStorage throws a SecurityError', () => {
			const originalWindow = globalThis.window;
			try {
				const restrictedWindow = {} as Window & typeof globalThis;
				Object.defineProperty(restrictedWindow, 'localStorage', {
					get() {
						throw new DOMException('The operation is insecure.', 'SecurityError');
					},
					configurable: true
				});
				(globalThis as unknown as { window: unknown }).window = restrictedWindow;

				const repo = new LocalStorageBreakActivityRepository();
				expect(repo.getStorage()).toBeNull();
			} finally {
				if (originalWindow === undefined) {
					delete (globalThis as unknown as { window?: unknown }).window;
				} else {
					(globalThis as unknown as { window: unknown }).window = originalWindow;
				}
			}
		});

		it('does not overwrite newer storage envelope versions on save, delete, or resetToDefaults and logs a warning', async () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const v2Envelope = JSON.stringify({
				version: 2,
				activities: [
					{
						id: 'v2-act-1',
						title: 'Future Activity',
						category: 'physical',
						durationMinutes: 5,
						isPreset: true
					}
				]
			});
			mockStorage.setItem(BREAK_ACTIVITIES_STORAGE_KEY, v2Envelope);

			const act = createBreakActivity({ id: 'act-1', title: 'New Act', category: 'mindful' });

			// 1. save() should NOT overwrite v2 envelope
			await repository.save(act);
			expect(mockStorage.getItem(BREAK_ACTIVITIES_STORAGE_KEY)).toBe(v2Envelope);
			expect(consoleWarnSpy).toHaveBeenCalledTimes(1);

			// 2. delete() should NOT overwrite v2 envelope
			await repository.delete('v2-act-1');
			expect(mockStorage.getItem(BREAK_ACTIVITIES_STORAGE_KEY)).toBe(v2Envelope);
			expect(consoleWarnSpy).toHaveBeenCalledTimes(2);

			// 3. resetToDefaults() should NOT overwrite v2 envelope
			await repository.resetToDefaults();
			expect(mockStorage.getItem(BREAK_ACTIVITIES_STORAGE_KEY)).toBe(v2Envelope);
			expect(consoleWarnSpy).toHaveBeenCalledTimes(3);

			consoleWarnSpy.mockRestore();
		});
	});
});
