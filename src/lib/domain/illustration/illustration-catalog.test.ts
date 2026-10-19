import { describe, expect, it } from 'vitest';
import {
	DEFAULT_ILLUSTRATION_ID,
	ILLUSTRATION_CATALOG,
	VALID_PHASE_COUNTS,
	findIllustration
} from './illustration-catalog';

describe('illustration catalog', () => {
	it('declares unique ids', () => {
		const ids = ILLUSTRATION_CATALOG.map((entry) => entry.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('ships the forest with 5 phases and the desert with 3 phases', () => {
		expect(findIllustration('forest')?.phaseCount).toBe(5);
		expect(findIllustration('desert')?.phaseCount).toBe(3);
	});

	it('only allows phase counts that divide 15', () => {
		for (const entry of ILLUSTRATION_CATALOG) {
			expect(VALID_PHASE_COUNTS).toContain(entry.phaseCount);
			expect(15 % entry.phaseCount).toBe(0);
		}
	});

	it('resolves the default illustration', () => {
		expect(findIllustration(DEFAULT_ILLUSTRATION_ID)).toBeDefined();
		expect(findIllustration(DEFAULT_ILLUSTRATION_ID)?.id).toBe('forest');
	});

	it('returns undefined for unknown ids', () => {
		expect(findIllustration('unknown')).toBeUndefined();
	});

	it('gives every entry a translation label key', () => {
		for (const entry of ILLUSTRATION_CATALOG) {
			expect(entry.labelKey.length).toBeGreaterThan(0);
			expect(entry.labelKey).toContain(entry.id);
		}
	});
});
