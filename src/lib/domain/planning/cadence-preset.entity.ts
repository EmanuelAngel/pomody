/**
 * Cadence preset entity: the four values that describe a focus/break rhythm, plus the
 * user-given name for a saved one.
 *
 * Pure TypeScript: no DOM, Svelte or Tauri. The limits live here as the single authority
 * shared by the planning setters, the preset validator and the persistence sanitizer, so
 * the three can never drift apart.
 */

/** The four values that describe a cadence, exactly as the planning panel edits them. */
export interface CadenceValues {
	readonly focusMinutes: number;
	readonly shortBreakMinutes: number;
	readonly longBreakMinutes: number;
	readonly longBreakInterval: number;
}

/** A cadence saved by the user under its own name. Values are immutable; only the name changes. */
export interface CadencePreset extends CadenceValues {
	/** Derived from the four values (`custom:45:15:30:3`), never from the name. */
	readonly id: string;
	readonly name: string;
}

/** Stable ids of the three cadences shipped with the product. */
export type BuiltInCadencePresetId = 'classic' | 'deep-focus' | 'ultradian';

/** A shipped cadence. The label is localized by the UI through `labelKey`. */
export interface BuiltInCadencePreset extends CadenceValues {
	readonly id: BuiltInCadencePresetId;
	readonly labelKey: BuiltInCadencePresetId;
}

export type CadenceField = keyof CadenceValues;

/**
 * Inclusive ranges per field. These mirror the bounds the planning steppers already
 * enforce; they are declared here so the setters clamp through the same source.
 */
export const CADENCE_LIMITS: Readonly<
	Record<CadenceField, { readonly min: number; readonly max: number }>
> = Object.freeze({
	focusMinutes: Object.freeze({ min: 1, max: 120 }),
	shortBreakMinutes: Object.freeze({ min: 1, max: 60 }),
	longBreakMinutes: Object.freeze({ min: 1, max: 90 }),
	longBreakInterval: Object.freeze({ min: 1, max: 12 })
});

/** Maximum length of a user-given preset name, after trimming. */
export const PRESET_NAME_MAX_LENGTH = 24;

/** Maximum number of user presets kept alongside the three built-ins. */
export const MAX_CUSTOM_CADENCE_PRESETS = 10;

/** The three cadences shipped with the product, in display order. */
export const BUILT_IN_CADENCE_PRESETS: readonly BuiltInCadencePreset[] = Object.freeze([
	Object.freeze({
		id: 'classic' as const,
		labelKey: 'classic' as const,
		focusMinutes: 25,
		shortBreakMinutes: 5,
		longBreakMinutes: 15,
		longBreakInterval: 4
	}),
	Object.freeze({
		id: 'deep-focus' as const,
		labelKey: 'deep-focus' as const,
		focusMinutes: 50,
		shortBreakMinutes: 10,
		longBreakMinutes: 20,
		longBreakInterval: 4
	}),
	Object.freeze({
		id: 'ultradian' as const,
		labelKey: 'ultradian' as const,
		focusMinutes: 90,
		shortBreakMinutes: 20,
		longBreakMinutes: 30,
		longBreakInterval: 3
	})
]);

/**
 * Rounds and clamps a finite field value into its declared range.
 * Callers guard against non-finite input before calling, exactly like the steppers do.
 */
export function clampCadenceField(field: CadenceField, value: number): number {
	const { min, max } = CADENCE_LIMITS[field];
	return Math.max(min, Math.min(max, Math.round(value)));
}

/**
 * Derives the stable id of a user preset from its four values. Values are immutable and
 * duplicates by value are rejected, so the tuple is the identity: `custom:45:15:30:3`.
 */
export function cadencePresetId(values: CadenceValues): string {
	return [
		'custom',
		values.focusMinutes,
		values.shortBreakMinutes,
		values.longBreakMinutes,
		values.longBreakInterval
	].join(':');
}

/** Formats the four values as `focus/short/long/interval`, the product's short cadence name. */
export function formatCadenceShort(values: CadenceValues): string {
	return [
		values.focusMinutes,
		values.shortBreakMinutes,
		values.longBreakMinutes,
		values.longBreakInterval
	].join('/');
}

/** True when all four values are equal. */
export function cadenceEquals(a: CadenceValues, b: CadenceValues): boolean {
	return (
		a.focusMinutes === b.focusMinutes &&
		a.shortBreakMinutes === b.shortBreakMinutes &&
		a.longBreakMinutes === b.longBreakMinutes &&
		a.longBreakInterval === b.longBreakInterval
	);
}

/** Trims and collapses inner whitespace, the comparable form of a preset name. */
export function normalizePresetName(raw: string): string {
	return raw.trim().replace(/\s+/g, ' ');
}

/** True when every field is an integer inside its declared range. */
function isWithinCadenceLimits(values: CadenceValues): boolean {
	return (Object.keys(CADENCE_LIMITS) as CadenceField[]).every((field) => {
		const value = values[field];
		const { min, max } = CADENCE_LIMITS[field];

		return (
			typeof value === 'number' &&
			Number.isFinite(value) &&
			Number.isInteger(value) &&
			value >= min &&
			value <= max
		);
	});
}

/** Why a preset was rejected. The UI maps each reason to a localized message. */
export type CadencePresetValidationError =
	| 'empty_name'
	| 'name_too_long'
	| 'duplicate_name'
	| 'out_of_range'
	| 'duplicate_values'
	| 'limit_reached';

export type CadencePresetValidation =
	| { readonly ok: true; readonly preset: CadencePreset }
	| { readonly ok: false; readonly reason: CadencePresetValidationError };

/**
 * Validates a preset the user is trying to save against the presets already stored.
 * Rejection order is stable so the UI always shows the most specific message:
 * empty name, name too long, duplicate name, out-of-range values, duplicate values, limit.
 *
 * Built-in labels never block a name: only custom presets are compared.
 */
export function validateCadencePreset(
	input: { readonly name: string; readonly values: CadenceValues },
	existing: readonly CadencePreset[]
): CadencePresetValidation {
	if (typeof input.name !== 'string') {
		return { ok: false, reason: 'empty_name' };
	}

	const name = normalizePresetName(input.name);
	if (name.length === 0) {
		return { ok: false, reason: 'empty_name' };
	}

	if (name.length > PRESET_NAME_MAX_LENGTH) {
		return { ok: false, reason: 'name_too_long' };
	}

	const comparableName = name.toLowerCase();
	const hasDuplicateName = existing.some(
		(preset) => normalizePresetName(preset.name).toLowerCase() === comparableName
	);
	if (hasDuplicateName) {
		return { ok: false, reason: 'duplicate_name' };
	}

	if (!isWithinCadenceLimits(input.values)) {
		return { ok: false, reason: 'out_of_range' };
	}

	const values: CadenceValues = {
		focusMinutes: input.values.focusMinutes,
		shortBreakMinutes: input.values.shortBreakMinutes,
		longBreakMinutes: input.values.longBreakMinutes,
		longBreakInterval: input.values.longBreakInterval
	};

	if (existing.some((preset) => cadenceEquals(preset, values))) {
		return { ok: false, reason: 'duplicate_values' };
	}

	if (existing.length >= MAX_CUSTOM_CADENCE_PRESETS) {
		return { ok: false, reason: 'limit_reached' };
	}

	return { ok: true, preset: Object.freeze({ id: cadencePresetId(values), name, ...values }) };
}

/**
 * Defensive validation of a persisted preset. The id is always recomputed from the values,
 * so a tampered or stale id self-heals instead of splitting one cadence into two entries.
 * Returns a frozen preset or null when the entry is corrupt.
 */
export function sanitizeCadencePreset(raw: unknown): CadencePreset | null {
	if (typeof raw !== 'object' || raw === null) {
		return null;
	}

	const candidate = raw as Record<string, unknown>;

	if (typeof candidate.name !== 'string') {
		return null;
	}

	const name = normalizePresetName(candidate.name);
	if (name.length === 0 || name.length > PRESET_NAME_MAX_LENGTH) {
		return null;
	}

	const values: CadenceValues = {
		focusMinutes: candidate.focusMinutes as number,
		shortBreakMinutes: candidate.shortBreakMinutes as number,
		longBreakMinutes: candidate.longBreakMinutes as number,
		longBreakInterval: candidate.longBreakInterval as number
	};

	if (!isWithinCadenceLimits(values)) {
		return null;
	}

	return Object.freeze({ id: cadencePresetId(values), name, ...values });
}

/**
 * Finds the preset matching the current cadence by comparing all four values.
 * A user preset wins over a built-in with identical values: the user named that cadence.
 */
export function findActiveCadenceId(
	cadence: CadenceValues,
	customPresets: readonly CadencePreset[],
	builtInPresets: readonly BuiltInCadencePreset[] = BUILT_IN_CADENCE_PRESETS
): string | null {
	const custom = customPresets.find((preset) => cadenceEquals(preset, cadence));
	if (custom) {
		return custom.id;
	}

	const builtIn = builtInPresets.find((preset) => cadenceEquals(preset, cadence));
	return builtIn ? builtIn.id : null;
}
