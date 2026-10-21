import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FakeCadencePresetRepository } from '$tests/fakes/repositories/fake-cadence-preset-repository';
import { CadencePresetsState, createCadencePresetsState } from './cadence-presets.svelte';
import {
	MAX_CUSTOM_CADENCE_PRESETS,
	cadencePresetId,
	type CadencePreset,
	type CadenceValues
} from '../domain/planning/cadence-preset.entity';

const DEEP_WORK: CadenceValues = {
	focusMinutes: 45,
	shortBreakMinutes: 15,
	longBreakMinutes: 30,
	longBreakInterval: 3
};

function createPreset(overrides: Partial<CadencePreset> = {}): CadencePreset {
	const values = {
		focusMinutes: overrides.focusMinutes ?? DEEP_WORK.focusMinutes,
		shortBreakMinutes: overrides.shortBreakMinutes ?? DEEP_WORK.shortBreakMinutes,
		longBreakMinutes: overrides.longBreakMinutes ?? DEEP_WORK.longBreakMinutes,
		longBreakInterval: overrides.longBreakInterval ?? DEEP_WORK.longBreakInterval
	};

	return {
		id: overrides.id ?? cadencePresetId(values),
		name: overrides.name ?? 'Deep work',
		...values
	};
}

describe('CadencePresetsState', () => {
	let repository: FakeCadencePresetRepository;
	let state: CadencePresetsState;

	beforeEach(() => {
		repository = new FakeCadencePresetRepository();
		state = createCadencePresetsState(repository);
	});

	describe('load', () => {
		it('should start empty and unloaded', () => {
			expect(state.presets).toEqual([]);
			expect(state.isLoaded).toBe(false);
		});

		it('should hydrate the list from the repository', async () => {
			const persisted = createPreset();
			repository = new FakeCadencePresetRepository([persisted]);
			state = createCadencePresetsState(repository);

			await state.load();

			expect(state.presets).toEqual([persisted]);
			expect(state.isLoaded).toBe(true);
			expect(repository.loadCallCount).toBe(1);
		});

		it('should load only once', async () => {
			await state.load();
			await state.load();

			expect(repository.loadCallCount).toBe(1);
		});

		it('should stay usable when the repository fails', async () => {
			vi.spyOn(repository, 'load').mockRejectedValue(new Error('storage unavailable'));
			const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

			await state.load();

			expect(state.presets).toEqual([]);
			expect(state.isLoaded).toBe(true);
			expect(consoleError).toHaveBeenCalled();
		});
	});

	describe('savePreset', () => {
		it('should append the preset and persist the whole list once', async () => {
			const result = await state.savePreset(DEEP_WORK, '  Deep   work ');

			expect(result).toEqual({
				ok: true,
				preset: { id: 'custom:45:15:30:3', name: 'Deep work', ...DEEP_WORK }
			});
			expect(state.presets).toEqual([createPreset()]);
			expect(repository.saveCallCount).toBe(1);
			expect(await repository.load()).toEqual([createPreset()]);
		});

		it('should keep the insertion order across several saves', async () => {
			await state.savePreset(DEEP_WORK, 'Deep work');
			await state.savePreset({ ...DEEP_WORK, focusMinutes: 50 }, 'Shallow');

			expect(state.presets.map((preset) => preset.name)).toEqual(['Deep work', 'Shallow']);
		});

		it('should reject an empty name without persisting', async () => {
			const result = await state.savePreset(DEEP_WORK, '   ');

			expect(result).toEqual({ ok: false, reason: 'empty_name' });
			expect(state.presets).toEqual([]);
			expect(repository.saveCallCount).toBe(0);
		});

		it('should reject a duplicate name without persisting', async () => {
			await state.savePreset(DEEP_WORK, 'Deep work');

			const result = await state.savePreset({ ...DEEP_WORK, focusMinutes: 50 }, 'deep WORK');

			expect(result).toEqual({ ok: false, reason: 'duplicate_name' });
			expect(state.presets).toHaveLength(1);
			expect(repository.saveCallCount).toBe(1);
		});

		it('should reject a cadence already saved without persisting', async () => {
			await state.savePreset(DEEP_WORK, 'Deep work');

			const result = await state.savePreset(DEEP_WORK, 'Other name');

			expect(result).toEqual({ ok: false, reason: 'duplicate_values' });
			expect(state.presets).toHaveLength(1);
			expect(repository.saveCallCount).toBe(1);
		});

		it('should reject out-of-range values without persisting', async () => {
			const result = await state.savePreset({ ...DEEP_WORK, focusMinutes: 121 }, 'Too long');

			expect(result).toEqual({ ok: false, reason: 'out_of_range' });
			expect(repository.saveCallCount).toBe(0);
		});

		it('should reject a new preset once the limit is reached', async () => {
			for (let index = 0; index < MAX_CUSTOM_CADENCE_PRESETS; index++) {
				await state.savePreset({ ...DEEP_WORK, focusMinutes: 10 + index }, `Preset ${index}`);
			}

			expect(state.canSaveMore).toBe(false);

			const result = await state.savePreset(DEEP_WORK, 'One more');

			expect(result).toEqual({ ok: false, reason: 'limit_reached' });
			expect(state.presets).toHaveLength(MAX_CUSTOM_CADENCE_PRESETS);
			expect(repository.saveCallCount).toBe(MAX_CUSTOM_CADENCE_PRESETS);
		});

		it('should allow saving again after deleting one', async () => {
			for (let index = 0; index < MAX_CUSTOM_CADENCE_PRESETS; index++) {
				await state.savePreset({ ...DEEP_WORK, focusMinutes: 10 + index }, `Preset ${index}`);
			}

			await state.deletePreset(state.presets[0].id);

			expect(state.canSaveMore).toBe(true);
			expect((await state.savePreset(DEEP_WORK, 'One more')).ok).toBe(true);
		});
	});

	describe('renamePreset', () => {
		beforeEach(async () => {
			await state.savePreset(DEEP_WORK, 'Deep work');
		});

		it('should rename in place keeping the id and the values', async () => {
			const result = await state.renamePreset('custom:45:15:30:3', '  Focus   45 ');

			expect(result).toEqual({
				ok: true,
				preset: { id: 'custom:45:15:30:3', name: 'Focus 45', ...DEEP_WORK }
			});
			expect(state.presets).toEqual([{ id: 'custom:45:15:30:3', name: 'Focus 45', ...DEEP_WORK }]);
			expect(repository.saveCallCount).toBe(2);
		});

		it('should accept the preset keeping its own name', async () => {
			const result = await state.renamePreset('custom:45:15:30:3', 'Deep work');

			expect(result.ok).toBe(true);
			expect(state.presets).toHaveLength(1);
		});

		it('should reject an empty name without persisting', async () => {
			const result = await state.renamePreset('custom:45:15:30:3', '  ');

			expect(result).toEqual({ ok: false, reason: 'empty_name' });
			expect(state.presets[0].name).toBe('Deep work');
			expect(repository.saveCallCount).toBe(1);
		});

		it('should reject a name already taken by another preset', async () => {
			await state.savePreset({ ...DEEP_WORK, focusMinutes: 50 }, 'Shallow');

			const result = await state.renamePreset('custom:45:15:30:3', 'shallow');

			expect(result).toEqual({ ok: false, reason: 'duplicate_name' });
			expect(state.presets[0].name).toBe('Deep work');
			expect(repository.saveCallCount).toBe(2);
		});

		it('should reject an unknown preset id without persisting', async () => {
			const result = await state.renamePreset('custom:1:1:1:1', 'Ghost');

			expect(result).toEqual({ ok: false, reason: 'unknown_preset' });
			expect(repository.saveCallCount).toBe(1);
		});
	});

	describe('deletePreset', () => {
		it('should remove the preset and persist the remaining list', async () => {
			await state.savePreset(DEEP_WORK, 'Deep work');
			await state.savePreset({ ...DEEP_WORK, focusMinutes: 50 }, 'Shallow');

			await state.deletePreset('custom:45:15:30:3');

			expect(state.presets).toEqual([
				{ id: 'custom:50:15:30:3', name: 'Shallow', ...DEEP_WORK, focusMinutes: 50 }
			]);
			expect(await repository.load()).toEqual(state.presets);
		});

		it('should do nothing for an unknown id', async () => {
			await state.savePreset(DEEP_WORK, 'Deep work');

			await state.deletePreset('custom:1:1:1:1');

			expect(state.presets).toHaveLength(1);
			expect(repository.saveCallCount).toBe(1);
		});
	});
});
