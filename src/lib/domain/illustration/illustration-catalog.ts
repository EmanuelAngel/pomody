/**
 * Pure metadata for the living companion illustrations.
 *
 * Renderers live in the component layer and are resolved by `id`.
 * Adding an illustration means adding one entry here plus one renderer,
 * never a new test: the contract test iterates this catalog.
 */

export const VALID_PHASE_COUNTS = [1, 3, 5, 15] as const;

export interface IllustrationDefinition {
	readonly id: string;
	readonly labelKey: string;
	/** Must divide 15 so every phase lasts the same number of steps. */
	readonly phaseCount: number;
}

export const ILLUSTRATION_CATALOG = [
	{
		id: 'forest',
		labelKey: 'settings_illustration_forest',
		phaseCount: 5
	},
	{
		id: 'desert',
		labelKey: 'settings_illustration_desert',
		phaseCount: 3
	}
] as const satisfies readonly IllustrationDefinition[];

export type IllustrationId = (typeof ILLUSTRATION_CATALOG)[number]['id'];

export const DEFAULT_ILLUSTRATION_ID: IllustrationId = 'forest';

export const DEFAULT_ILLUSTRATION: IllustrationDefinition =
	ILLUSTRATION_CATALOG.find((entry) => entry.id === DEFAULT_ILLUSTRATION_ID) ??
	ILLUSTRATION_CATALOG[0];

/**
 * Resolves catalog metadata by id. Unknown ids return `undefined` so the
 * presentation layer can fall back to the default entry.
 */
export function findIllustration(id: string): IllustrationDefinition | undefined {
	return ILLUSTRATION_CATALOG.find((entry) => entry.id === id);
}
