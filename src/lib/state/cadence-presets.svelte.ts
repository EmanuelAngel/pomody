import { LocalStorageCadencePresetRepository } from '../adapters/storage/local-cadence-preset-repository';
import {
	MAX_CUSTOM_CADENCE_PRESETS,
	validateCadencePreset,
	type CadencePreset,
	type CadencePresetValidationError,
	type CadenceValues
} from '../domain/planning/cadence-preset.entity';
import type { ICadencePresetRepository } from '../domain/ports/cadence-preset-repository.port';

/** Why a preset mutation was rejected. `unknown_preset` can only come from the state layer. */
export type CadencePresetMutationError = CadencePresetValidationError | 'unknown_preset';

export type CadencePresetMutationResult =
	| { readonly ok: true; readonly preset: CadencePreset }
	| { readonly ok: false; readonly reason: CadencePresetMutationError };

/**
 * Reactive state of the user's cadence presets.
 *
 * Owns the list and its persistence; the built-in cadences live in the domain and are never
 * stored. Every mutation validates before writing, so a rejected preset leaves both the list
 * and the persisted payload untouched.
 */
export class CadencePresetsState {
	private readonly repository: ICadencePresetRepository;

	private _presets = $state<readonly CadencePreset[]>([]);
	private _isLoaded = $state<boolean>(false);
	private _isLoading = $state<boolean>(false);

	public readonly presets = $derived.by<readonly CadencePreset[]>(() => this._presets);
	public readonly isLoaded = $derived.by<boolean>(() => this._isLoaded);

	/** False once the user reached the maximum number of saved presets. */
	public readonly canSaveMore = $derived.by<boolean>(
		() => this._presets.length < MAX_CUSTOM_CADENCE_PRESETS
	);

	constructor(repository?: ICadencePresetRepository) {
		this.repository = repository ?? new LocalStorageCadencePresetRepository();
	}

	/**
	 * Loads the persisted presets once. A repository failure never blocks startup: the state
	 * stays usable and simply starts without user presets.
	 */
	public async load(): Promise<void> {
		if (this._isLoaded) {
			return;
		}

		this._isLoading = true;
		try {
			this._presets = await this.repository.load();
		} catch (error) {
			console.error('Failed to load cadence presets; starting without user presets.', error);
		} finally {
			this._isLoading = false;
			this._isLoaded = true;
		}
	}

	/**
	 * Saves the given cadence under a new name. Rejected presets are never persisted.
	 */
	public async savePreset(
		cadence: CadenceValues,
		name: string
	): Promise<CadencePresetMutationResult> {
		const validation = validateCadencePreset({ name, values: cadence }, this._presets);
		if (!validation.ok) {
			return { ok: false, reason: validation.reason };
		}

		this._presets = [...this._presets, validation.preset];
		await this.persist();

		return { ok: true, preset: validation.preset };
	}

	/**
	 * Renames a saved preset. Values are immutable, so the preset keeps its derived id and
	 * its position in the list; only the name changes.
	 */
	public async renamePreset(id: string, name: string): Promise<CadencePresetMutationResult> {
		const target = this._presets.find((preset) => preset.id === id);
		if (target === undefined) {
			return { ok: false, reason: 'unknown_preset' };
		}

		const others = this._presets.filter((preset) => preset.id !== id);
		const validation = validateCadencePreset({ name, values: target }, others);
		if (!validation.ok) {
			return { ok: false, reason: validation.reason };
		}

		const renamed: CadencePreset = Object.freeze({ ...target, name: validation.preset.name });
		this._presets = this._presets.map((preset) => (preset.id === id ? renamed : preset));
		await this.persist();

		return { ok: true, preset: renamed };
	}

	/**
	 * Deletes a saved preset. An unknown id is a no-op: nothing is removed and nothing is written.
	 */
	public async deletePreset(id: string): Promise<void> {
		if (!this._presets.some((preset) => preset.id === id)) {
			return;
		}

		this._presets = this._presets.filter((preset) => preset.id !== id);
		await this.persist();
	}

	private async persist(): Promise<void> {
		await this.repository.save(this._presets);
	}
}

/**
 * Factory function to create isolated CadencePresetsState instances.
 */
export function createCadencePresetsState(
	repository?: ICadencePresetRepository
): CadencePresetsState {
	return new CadencePresetsState(repository);
}

/**
 * Global singleton reactive cadence preset state for the application.
 */
export const cadencePresetsState = new CadencePresetsState();

export default cadencePresetsState;
