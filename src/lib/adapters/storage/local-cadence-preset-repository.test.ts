import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	CADENCE_PRESETS_STORAGE_KEY,
	CADENCE_PRESETS_STORAGE_VERSION,
	LocalStorageCadencePresetRepository,
	type StoredCadencePresetsEnvelope
} from './local-cadence-preset-repository';
import { InMemoryStorage } from './in-memory-storage';
import { cadencePresetId, type CadencePreset } from '../../domain/planning/cadence-preset.entity';

const UNRELATED_STORAGE_KEY = 'pomody:settings';

const USER_VALUES = {
	focusMinutes: 45,
	shortBreakMinutes: 15,
	longBreakMinutes: 30,
	longBreakInterval: 3
};

function createPreset(overrides: Partial<CadencePreset> = {}): CadencePreset {
	const values = {
		focusMinutes: overrides.focusMinutes ?? USER_VALUES.focusMinutes,
		shortBreakMinutes: overrides.shortBreakMinutes ?? USER_VALUES.shortBreakMinutes,
		longBreakMinutes: overrides.longBreakMinutes ?? USER_VALUES.longBreakMinutes,
		longBreakInterval: overrides.longBreakInterval ?? USER_VALUES.longBreakInterval
	};

	return {
		id: overrides.id ?? cadencePresetId(values),
		name: overrides.name ?? 'Deep work',
		...values
	};
}

function storeEnvelope(storage: Storage, envelope: unknown): void {
	storage.setItem(CADENCE_PRESETS_STORAGE_KEY, JSON.stringify(envelope));
}

function readStoredEnvelope(storage: Storage): StoredCadencePresetsEnvelope | null {
	const raw = storage.getItem(CADENCE_PRESETS_STORAGE_KEY);
	return raw === null ? null : (JSON.parse(raw) as StoredCadencePresetsEnvelope);
}

describe('LocalStorageCadencePresetRepository', () => {
	let storage: InMemoryStorage;
	let repository: LocalStorageCadencePresetRepository;

	beforeEach(() => {
		storage = new InMemoryStorage();
		repository = new LocalStorageCadencePresetRepository(storage);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('load', () => {
		it('returns an empty list when nothing is stored', async () => {
			expect(await repository.load()).toEqual([]);
		});

		it('returns an empty list when storage throws on read', async () => {
			vi.spyOn(storage, 'getItem').mockImplementation(() => {
				throw new Error('SecurityError');
			});

			expect(await repository.load()).toEqual([]);
		});

		it('returns an empty list when the payload is not valid JSON', async () => {
			storage.setItem(CADENCE_PRESETS_STORAGE_KEY, '{ not json');

			expect(await repository.load()).toEqual([]);
		});

		it('returns an empty list when the payload is not an object', async () => {
			storage.setItem(CADENCE_PRESETS_STORAGE_KEY, JSON.stringify('nope'));

			expect(await repository.load()).toEqual([]);
		});

		it('returns an empty list when the envelope version is unknown', async () => {
			storeEnvelope(storage, {
				version: CADENCE_PRESETS_STORAGE_VERSION + 1,
				presets: [createPreset()]
			});

			expect(await repository.load()).toEqual([]);
		});

		it('returns an empty list when presets is not an array', async () => {
			storeEnvelope(storage, { version: CADENCE_PRESETS_STORAGE_VERSION, presets: 'nope' });

			expect(await repository.load()).toEqual([]);
		});

		it('drops corrupt entries and keeps the valid ones', async () => {
			storeEnvelope(storage, {
				version: CADENCE_PRESETS_STORAGE_VERSION,
				presets: [
					createPreset({ name: 'Deep work' }),
					{
						name: 'Broken',
						focusMinutes: '45',
						shortBreakMinutes: 15,
						longBreakMinutes: 30,
						longBreakInterval: 3
					},
					null,
					createPreset({ name: 'Shallow', focusMinutes: 20 })
				]
			});

			expect(await repository.load()).toEqual([
				createPreset({ name: 'Deep work' }),
				createPreset({ name: 'Shallow', focusMinutes: 20 })
			]);
		});

		it('recomputes a tampered id from the stored values', async () => {
			storeEnvelope(storage, {
				version: CADENCE_PRESETS_STORAGE_VERSION,
				presets: [{ ...createPreset(), id: 'tampered' }]
			});

			const loaded = await repository.load();

			expect(loaded).toEqual([createPreset()]);
		});

		it('collapses entries that resolve to the same derived id', async () => {
			storeEnvelope(storage, {
				version: CADENCE_PRESETS_STORAGE_VERSION,
				presets: [createPreset({ name: 'Deep work' }), createPreset({ name: 'Duplicated' })]
			});

			expect(await repository.load()).toEqual([createPreset({ name: 'Deep work' })]);
		});

		it('caps the list at the maximum number of custom presets', async () => {
			const presets = Array.from({ length: 12 }, (_, index) =>
				createPreset({ name: `Preset ${index}`, focusMinutes: 10 + index })
			);
			storeEnvelope(storage, { version: CADENCE_PRESETS_STORAGE_VERSION, presets });

			const loaded = await repository.load();

			expect(loaded).toHaveLength(10);
			expect(loaded[9]).toEqual(presets[9]);
		});
	});

	describe('save', () => {
		it('round-trips a saved preset', async () => {
			const preset = createPreset();

			await repository.save([preset]);

			expect(await repository.load()).toEqual([preset]);
		});

		it('round-trips several presets preserving their order', async () => {
			const presets = [
				createPreset({ name: 'First' }),
				createPreset({ name: 'Second', focusMinutes: 50 })
			];

			await repository.save(presets);

			expect(await repository.load()).toEqual(presets);
		});

		it('replaces the previous payload instead of appending', async () => {
			await repository.save([createPreset({ name: 'First' })]);
			await repository.save([createPreset({ name: 'Second', focusMinutes: 50 })]);

			expect(await repository.load()).toEqual([createPreset({ name: 'Second', focusMinutes: 50 })]);
		});

		it('drops invalid entries instead of persisting them', async () => {
			const valid = createPreset();
			const invalid = { ...createPreset({ name: 'Broken', focusMinutes: 20 }), focusMinutes: 200 };

			await repository.save([valid, invalid as CadencePreset]);

			expect(await repository.load()).toEqual([valid]);
		});

		it('does not throw when storage rejects the write', async () => {
			vi.spyOn(storage, 'setItem').mockImplementation(() => {
				throw new Error('QuotaExceededError');
			});
			const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

			await expect(repository.save([createPreset()])).resolves.toBeUndefined();

			expect(consoleError).toHaveBeenCalled();
		});

		it('refuses to overwrite a payload written by a newer version', async () => {
			const newerEnvelope = { version: CADENCE_PRESETS_STORAGE_VERSION + 1, presets: [] };
			storeEnvelope(storage, newerEnvelope);
			const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

			await repository.save([createPreset()]);

			expect(readStoredEnvelope(storage)).toEqual(newerEnvelope);
			expect(consoleWarn).toHaveBeenCalled();
		});

		it('never touches unrelated storage keys', async () => {
			storage.setItem(UNRELATED_STORAGE_KEY, '{"theme":"dark"}');

			await repository.save([createPreset()]);

			expect(storage.getItem(UNRELATED_STORAGE_KEY)).toBe('{"theme":"dark"}');
		});

		it('writes the versioned envelope', async () => {
			const preset = createPreset();

			await repository.save([preset]);

			expect(readStoredEnvelope(storage)).toEqual({
				version: CADENCE_PRESETS_STORAGE_VERSION,
				presets: [preset]
			});
		});
	});
});
