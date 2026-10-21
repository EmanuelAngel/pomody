import type { CadencePreset } from '$lib/domain/planning/cadence-preset.entity';
import type { ICadencePresetRepository } from '$lib/domain/ports/cadence-preset-repository.port';

/**
 * In-memory test fake implementing ICadencePresetRepository.
 * Keeps the list in memory and tracks call counts for test assertions.
 */
export class FakeCadencePresetRepository implements ICadencePresetRepository {
	private presets: CadencePreset[];
	public loadCallCount = 0;
	public saveCallCount = 0;

	constructor(initialPresets: readonly CadencePreset[] = []) {
		this.presets = [...initialPresets];
	}

	async load(): Promise<readonly CadencePreset[]> {
		this.loadCallCount++;
		return [...this.presets];
	}

	async save(presets: readonly CadencePreset[]): Promise<void> {
		this.saveCallCount++;
		this.presets = [...presets];
	}
}
