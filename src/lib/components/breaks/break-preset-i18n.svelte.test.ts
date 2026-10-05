import { describe, it, expect, beforeEach } from 'vitest';
import {
	getLocalizedPresetTitle,
	getLocalizedPresetGuide,
	getLocalizedBreakCategory
} from './break-preset-i18n';
import { localeState } from '$lib/state/locale.svelte';
import { PRESET_BREAK_ACTIVITIES } from '$lib/domain/breaks/break-activity.entity';

describe('break-preset-i18n', () => {
	beforeEach(() => {
		localeState.setLocale('en');
	});

	it('resolves all 10 presets to english titles and guides by default', () => {
		for (const preset of PRESET_BREAK_ACTIVITIES) {
			const title = getLocalizedPresetTitle(preset);
			const guide = getLocalizedPresetGuide(preset);

			expect(title).toBe(preset.title);
			expect(guide).toBe(preset.guide);
		}
	});

	it('resolves all 10 presets to spanish titles and guides when locale is es', () => {
		localeState.setLocale('es');

		const neck = PRESET_BREAK_ACTIVITIES.find((p) => p.id === 'preset-neck-shoulder-stretch')!;
		expect(getLocalizedPresetTitle(neck)).toBe('Alivio de cuello y hombros');
		expect(getLocalizedPresetGuide(neck)).toContain('Incliná suavemente la oreja');

		const tea = PRESET_BREAK_ACTIVITIES.find((p) => p.id === 'preset-mindful-herbal-tea')!;
		expect(getLocalizedPresetTitle(tea)).toBe('Té de hierbas consciente');
		expect(getLocalizedPresetGuide(tea)).toContain('Prepará una taza');

		const water = PRESET_BREAK_ACTIVITIES.find((p) => p.id === 'preset-glass-of-water')!;
		expect(getLocalizedPresetTitle(water)).toBe('Hidratarse con agua fresca');

		const breathing = PRESET_BREAK_ACTIVITIES.find((p) => p.id === 'preset-box-breathing')!;
		expect(getLocalizedPresetTitle(breathing)).toBe('Respiración cuadrada de foco');
	});

	it('falls back to custom title and guide when isPreset is false', () => {
		const custom = {
			id: 'preset-neck-shoulder-stretch',
			title: 'Custom Neck Exercise',
			guide: 'Custom guide',
			isPreset: false
		};

		expect(getLocalizedPresetTitle(custom)).toBe('Custom Neck Exercise');
		expect(getLocalizedPresetGuide(custom)).toBe('Custom guide');

		localeState.setLocale('es');

		expect(getLocalizedPresetTitle(custom)).toBe('Custom Neck Exercise');
		expect(getLocalizedPresetGuide(custom)).toBe('Custom guide');
	});

	it('falls back to activity title and guide when id is not a known preset', () => {
		const unknown = {
			id: 'custom-unknown-id',
			title: 'My Custom Walk',
			guide: 'Walk in garden',
			isPreset: true
		};

		expect(getLocalizedPresetTitle(unknown)).toBe('My Custom Walk');
		expect(getLocalizedPresetGuide(unknown)).toBe('Walk in garden');

		localeState.setLocale('es');

		expect(getLocalizedPresetTitle(unknown)).toBe('My Custom Walk');
		expect(getLocalizedPresetGuide(unknown)).toBe('Walk in garden');
	});

	it('localizes categories reactively', () => {
		expect(getLocalizedBreakCategory('physical')).toBe('Physical');
		expect(getLocalizedBreakCategory('mindful')).toBe('Mindful');
		expect(getLocalizedBreakCategory('hydration')).toBe('Hydration');

		localeState.setLocale('es');

		expect(getLocalizedBreakCategory('physical')).toBe('Físico');
		expect(getLocalizedBreakCategory('mindful')).toBe('Mental');
		expect(getLocalizedBreakCategory('hydration')).toBe('Hidratación');
	});
});
