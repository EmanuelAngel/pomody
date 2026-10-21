import { describe, it, expect } from 'vitest';
import { FakeCadencePresetRepository } from '$tests/fakes/repositories/fake-cadence-preset-repository';
import type { ICadencePresetRepository } from './cadence-preset-repository.port';
import { cadencePresetId, type CadencePreset } from '../planning/cadence-preset.entity';

function createPreset(name: string, focusMinutes: number): CadencePreset {
	const values = {
		focusMinutes,
		shortBreakMinutes: 15,
		longBreakMinutes: 30,
		longBreakInterval: 3
	};

	return { id: cadencePresetId(values), name, ...values };
}

describe('ICadencePresetRepository port contract', () => {
	it('should satisfy the ICadencePresetRepository contract across all operations', async () => {
		const repository: ICadencePresetRepository = new FakeCadencePresetRepository();

		expect(await repository.load()).toEqual([]);

		const preset = createPreset('Deep work', 45);
		await repository.save([preset]);

		expect(await repository.load()).toEqual([preset]);

		await repository.save([]);
		expect(await repository.load()).toEqual([]);
	});
});
