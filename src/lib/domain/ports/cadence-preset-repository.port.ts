import type { CadencePreset } from '../planning/cadence-preset.entity';

/**
 * Domain port defining persistence for user-saved cadence presets.
 * Follows Hexagonal Architecture: pure TypeScript, zero dependencies on DOM, Svelte, or Tauri.
 *
 * The repository owns one list. A missing, corrupt or version-mismatched payload resolves to
 * an empty list; the built-in cadences live in the domain and are never persisted.
 */
export interface ICadencePresetRepository {
	/**
	 * Retrieves every persisted user preset, in insertion order.
	 * Returns an empty list when nothing is stored, storage is unsupported, or the payload is invalid.
	 */
	load(): Promise<readonly CadencePreset[]>;

	/**
	 * Persists the complete list, replacing the previous payload.
	 */
	save(presets: readonly CadencePreset[]): Promise<void>;
}
