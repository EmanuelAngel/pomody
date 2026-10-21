import { describe, it, expect } from 'vitest';
import {
	BUILT_IN_CADENCE_PRESETS,
	CADENCE_LIMITS,
	MAX_CUSTOM_CADENCE_PRESETS,
	PRESET_NAME_MAX_LENGTH,
	cadenceEquals,
	cadencePresetId,
	clampCadenceField,
	findActiveCadenceId,
	formatCadenceShort,
	normalizePresetName,
	sanitizeCadencePreset,
	validateCadencePreset,
	type CadencePreset,
	type CadenceValues
} from './cadence-preset.entity';

const USER_CADENCE: CadenceValues = {
	focusMinutes: 45,
	shortBreakMinutes: 15,
	longBreakMinutes: 30,
	longBreakInterval: 3
};

function createCustomPreset(overrides: Partial<CadencePreset> = {}): CadencePreset {
	const values: CadenceValues = {
		focusMinutes: overrides.focusMinutes ?? 45,
		shortBreakMinutes: overrides.shortBreakMinutes ?? 15,
		longBreakMinutes: overrides.longBreakMinutes ?? 30,
		longBreakInterval: overrides.longBreakInterval ?? 3
	};

	return {
		...values,
		id: overrides.id ?? cadencePresetId(values),
		name: overrides.name ?? 'Deep work'
	};
}

describe('CADENCE_LIMITS', () => {
	it('exposes the ranges the steppers already enforce', () => {
		expect(CADENCE_LIMITS).toEqual({
			focusMinutes: { min: 1, max: 120 },
			shortBreakMinutes: { min: 1, max: 60 },
			longBreakMinutes: { min: 1, max: 90 },
			longBreakInterval: { min: 1, max: 12 }
		});
	});
});

describe('clampCadenceField', () => {
	it('clamps focus minutes into 1-120 and rounds to an integer', () => {
		expect(clampCadenceField('focusMinutes', 200)).toBe(120);
		expect(clampCadenceField('focusMinutes', 0)).toBe(1);
		expect(clampCadenceField('focusMinutes', 24.6)).toBe(25);
	});

	it('clamps short break minutes into 1-60', () => {
		expect(clampCadenceField('shortBreakMinutes', 90)).toBe(60);
		expect(clampCadenceField('shortBreakMinutes', -3)).toBe(1);
	});

	it('clamps long break minutes into 1-90', () => {
		expect(clampCadenceField('longBreakMinutes', 120)).toBe(90);
		expect(clampCadenceField('longBreakMinutes', 0.4)).toBe(1);
	});

	it('clamps the long break interval into 1-12', () => {
		expect(clampCadenceField('longBreakInterval', 20)).toBe(12);
		expect(clampCadenceField('longBreakInterval', 0)).toBe(1);
	});
});

describe('BUILT_IN_CADENCE_PRESETS', () => {
	it('keeps the three shipped cadences with their values and label keys', () => {
		expect(BUILT_IN_CADENCE_PRESETS.map((preset) => preset.id)).toEqual([
			'classic',
			'deep-focus',
			'ultradian'
		]);
		expect(BUILT_IN_CADENCE_PRESETS.map((preset) => formatCadenceShort(preset))).toEqual([
			'25/5/15/4',
			'50/10/20/4',
			'90/20/30/3'
		]);
		expect(BUILT_IN_CADENCE_PRESETS.map((preset) => preset.labelKey)).toEqual([
			'classic',
			'deep-focus',
			'ultradian'
		]);
	});
});

describe('cadencePresetId', () => {
	it('derives a stable id from the four values', () => {
		expect(cadencePresetId(USER_CADENCE)).toBe('custom:45:15:30:3');
	});

	it('ignores the preset name', () => {
		expect(cadencePresetId(USER_CADENCE)).toBe(
			cadencePresetId({ ...USER_CADENCE, focusMinutes: 45 })
		);
	});

	it('changes when any of the four values changes', () => {
		expect(cadencePresetId(USER_CADENCE)).not.toBe(
			cadencePresetId({ ...USER_CADENCE, longBreakInterval: 4 })
		);
	});
});

describe('formatCadenceShort', () => {
	it('formats the four values as focus/short/long/interval', () => {
		expect(formatCadenceShort(USER_CADENCE)).toBe('45/15/30/3');
	});
});

describe('cadenceEquals', () => {
	it('is true only when all four values match', () => {
		expect(cadenceEquals(USER_CADENCE, { ...USER_CADENCE })).toBe(true);
		expect(cadenceEquals(USER_CADENCE, { ...USER_CADENCE, longBreakInterval: 4 })).toBe(false);
		expect(cadenceEquals(USER_CADENCE, { ...USER_CADENCE, longBreakMinutes: 15 })).toBe(false);
	});
});

describe('normalizePresetName', () => {
	it('trims and collapses inner whitespace', () => {
		expect(normalizePresetName('  Deep   work ')).toBe('Deep work');
	});

	it('returns an empty string for whitespace-only input', () => {
		expect(normalizePresetName('   \t ')).toBe('');
	});
});

describe('validateCadencePreset', () => {
	it('accepts a valid preset and derives its id from the values', () => {
		const result = validateCadencePreset({ name: '  Deep   work  ', values: USER_CADENCE }, []);

		expect(result).toEqual({
			ok: true,
			preset: {
				id: 'custom:45:15:30:3',
				name: 'Deep work',
				...USER_CADENCE
			}
		});
	});

	it('accepts a name of exactly the maximum length', () => {
		const name = 'a'.repeat(PRESET_NAME_MAX_LENGTH);
		const result = validateCadencePreset({ name, values: USER_CADENCE }, []);

		expect(result.ok).toBe(true);
	});

	it('rejects an empty or whitespace-only name', () => {
		expect(validateCadencePreset({ name: '', values: USER_CADENCE }, [])).toEqual({
			ok: false,
			reason: 'empty_name'
		});
		expect(validateCadencePreset({ name: '   ', values: USER_CADENCE }, [])).toEqual({
			ok: false,
			reason: 'empty_name'
		});
	});

	it('rejects a name longer than the maximum', () => {
		const name = 'a'.repeat(PRESET_NAME_MAX_LENGTH + 1);

		expect(validateCadencePreset({ name, values: USER_CADENCE }, [])).toEqual({
			ok: false,
			reason: 'name_too_long'
		});
	});

	it('rejects a duplicate name ignoring case and extra spaces', () => {
		const existing = [createCustomPreset({ name: 'Deep work' })];

		expect(
			validateCadencePreset(
				{ name: '  deep   WORK ', values: { ...USER_CADENCE, focusMinutes: 50 } },
				existing
			)
		).toEqual({ ok: false, reason: 'duplicate_name' });
	});

	it('does not treat a built-in label as a taken name', () => {
		const result = validateCadencePreset({ name: 'Classic', values: USER_CADENCE }, []);

		expect(result.ok).toBe(true);
	});

	it('rejects values outside their range', () => {
		expect(
			validateCadencePreset(
				{ name: 'Too long', values: { ...USER_CADENCE, focusMinutes: 121 } },
				[]
			)
		).toEqual({ ok: false, reason: 'out_of_range' });
		expect(
			validateCadencePreset(
				{ name: 'No interval', values: { ...USER_CADENCE, longBreakInterval: 0 } },
				[]
			)
		).toEqual({ ok: false, reason: 'out_of_range' });
	});

	it('rejects values already saved under another name', () => {
		const existing = [createCustomPreset({ name: 'Other name' })];

		expect(validateCadencePreset({ name: 'Deep work', values: USER_CADENCE }, existing)).toEqual({
			ok: false,
			reason: 'duplicate_values'
		});
	});

	it('rejects a new preset once the custom limit is reached', () => {
		const existing = Array.from({ length: MAX_CUSTOM_CADENCE_PRESETS }, (_, index) =>
			createCustomPreset({
				name: `Preset ${index}`,
				focusMinutes: 10 + index,
				longBreakInterval: (index % 12) + 1
			})
		);

		expect(validateCadencePreset({ name: 'One more', values: USER_CADENCE }, existing)).toEqual({
			ok: false,
			reason: 'limit_reached'
		});
	});

	it('accepts a new preset when one slot is still free', () => {
		const existing = Array.from({ length: MAX_CUSTOM_CADENCE_PRESETS - 1 }, (_, index) =>
			createCustomPreset({
				name: `Preset ${index}`,
				focusMinutes: 10 + index,
				longBreakInterval: (index % 12) + 1
			})
		);

		expect(validateCadencePreset({ name: 'One more', values: USER_CADENCE }, existing).ok).toBe(
			true
		);
	});
});

describe('sanitizeCadencePreset', () => {
	it('returns a frozen preset and recomputes the id from the values', () => {
		const sanitized = sanitizeCadencePreset({
			id: 'tampered-id',
			name: '  Deep   work ',
			...USER_CADENCE
		});

		expect(sanitized).toEqual({
			id: 'custom:45:15:30:3',
			name: 'Deep work',
			...USER_CADENCE
		});
		expect(Object.isFrozen(sanitized)).toBe(true);
	});

	it('rejects anything that is not an object', () => {
		expect(sanitizeCadencePreset(null)).toBeNull();
		expect(sanitizeCadencePreset('custom:45:15:30:3')).toBeNull();
		expect(sanitizeCadencePreset(undefined)).toBeNull();
	});

	it('rejects a preset with a missing or invalid name', () => {
		expect(sanitizeCadencePreset({ ...USER_CADENCE })).toBeNull();
		expect(sanitizeCadencePreset({ name: '  ', ...USER_CADENCE })).toBeNull();
		expect(
			sanitizeCadencePreset({ name: 'a'.repeat(PRESET_NAME_MAX_LENGTH + 1), ...USER_CADENCE })
		).toBeNull();
	});

	it('rejects a preset with a non-integer or out-of-range value', () => {
		expect(
			sanitizeCadencePreset({ name: 'Deep work', ...USER_CADENCE, focusMinutes: 45.5 })
		).toBeNull();
		expect(
			sanitizeCadencePreset({ name: 'Deep work', ...USER_CADENCE, focusMinutes: 121 })
		).toBeNull();
		expect(
			sanitizeCadencePreset({ name: 'Deep work', ...USER_CADENCE, longBreakInterval: 13 })
		).toBeNull();
		expect(
			sanitizeCadencePreset({ name: 'Deep work', ...USER_CADENCE, shortBreakMinutes: '15' })
		).toBeNull();
	});
});

describe('findActiveCadenceId', () => {
	it('matches a built-in cadence by all four values', () => {
		expect(
			findActiveCadenceId(
				{ focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15, longBreakInterval: 4 },
				[]
			)
		).toBe('classic');
	});

	it('does not match a built-in when only focus and short break coincide', () => {
		expect(
			findActiveCadenceId(
				{ focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 30, longBreakInterval: 4 },
				[]
			)
		).toBeNull();
		expect(
			findActiveCadenceId(
				{ focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15, longBreakInterval: 3 },
				[]
			)
		).toBeNull();
	});

	it('matches a custom preset by its four values', () => {
		expect(findActiveCadenceId(USER_CADENCE, [createCustomPreset()])).toBe('custom:45:15:30:3');
	});

	it('prefers the custom preset when it collides with a built-in', () => {
		const collision = createCustomPreset({
			name: 'Work',
			focusMinutes: 25,
			shortBreakMinutes: 5,
			longBreakMinutes: 15,
			longBreakInterval: 4
		});

		expect(
			findActiveCadenceId(
				{ focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15, longBreakInterval: 4 },
				[collision]
			)
		).toBe(collision.id);
	});

	it('returns null when no preset matches', () => {
		expect(findActiveCadenceId(USER_CADENCE, [])).toBeNull();
	});
});
