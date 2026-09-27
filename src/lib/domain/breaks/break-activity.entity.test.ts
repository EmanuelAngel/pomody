import { describe, it, expect, vi } from 'vitest';
import {
	BREAK_ACTIVITY_TITLE_MAX_LENGTH,
	BREAK_ACTIVITY_GUIDE_MAX_LENGTH,
	VALID_BREAK_CATEGORIES,
	InvalidBreakActivityTitleError,
	InvalidBreakActivityGuideError,
	InvalidBreakActivityDurationError,
	InvalidBreakActivityCategoryError,
	InvalidBreakActivityIdError,
	generateBreakActivityId,
	validateBreakActivityTitle,
	validateBreakActivityCategory,
	validateBreakActivityDuration,
	validateBreakActivityGuide,
	validateBreakActivityId,
	createBreakActivity,
	PRESET_BREAK_ACTIVITIES,
	pickNextBreakActivity,
	type BreakActivity
} from './break-activity.entity';

describe('BreakActivity Domain Entity', () => {
	describe('generateBreakActivityId', () => {
		it('should generate a valid RFC 4122 v4 UUID in standard environment', () => {
			const id = generateBreakActivityId();
			expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
		});

		it('should fall back to RFC 4122 v4 generator when crypto.randomUUID is not available', () => {
			try {
				vi.stubGlobal('crypto', undefined);
				const idNoCrypto = generateBreakActivityId();
				expect(idNoCrypto).toMatch(
					/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
				);

				vi.stubGlobal('crypto', {});
				const idEmptyCrypto = generateBreakActivityId();
				expect(idEmptyCrypto).toMatch(
					/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
				);
			} finally {
				vi.unstubAllGlobals();
			}
		});
	});

	describe('validateBreakActivityTitle', () => {
		it('should trim leading and trailing whitespace', () => {
			expect(validateBreakActivityTitle('   Neck stretch   ')).toBe('Neck stretch');
		});

		it('should accept a title at the maximum length boundary (120 characters)', () => {
			const maxTitle = 'x'.repeat(BREAK_ACTIVITY_TITLE_MAX_LENGTH);
			expect(validateBreakActivityTitle(maxTitle)).toBe(maxTitle);
		});

		it('should throw InvalidBreakActivityTitleError if title is empty or only whitespace', () => {
			expect(() => validateBreakActivityTitle('')).toThrow(InvalidBreakActivityTitleError);
			expect(() => validateBreakActivityTitle('   ')).toThrow(InvalidBreakActivityTitleError);
		});

		it('should throw InvalidBreakActivityTitleError if title exceeds maximum length', () => {
			const overLimitTitle = 'x'.repeat(BREAK_ACTIVITY_TITLE_MAX_LENGTH + 1);
			expect(() => validateBreakActivityTitle(overLimitTitle)).toThrow(
				InvalidBreakActivityTitleError
			);
		});

		it('should throw InvalidBreakActivityTitleError if title is not a string', () => {
			expect(() => validateBreakActivityTitle(null)).toThrow(InvalidBreakActivityTitleError);
			expect(() => validateBreakActivityTitle(undefined)).toThrow(InvalidBreakActivityTitleError);
			expect(() => validateBreakActivityTitle(123)).toThrow(InvalidBreakActivityTitleError);
		});
	});

	describe('validateBreakActivityCategory', () => {
		it('should accept valid categories', () => {
			for (const cat of VALID_BREAK_CATEGORIES) {
				expect(validateBreakActivityCategory(cat)).toBe(cat);
			}
		});

		it('should throw InvalidBreakActivityCategoryError for invalid category strings', () => {
			expect(() => validateBreakActivityCategory('exercise')).toThrow(
				InvalidBreakActivityCategoryError
			);
			expect(() => validateBreakActivityCategory('rest')).toThrow(
				InvalidBreakActivityCategoryError
			);
			expect(() => validateBreakActivityCategory('')).toThrow(InvalidBreakActivityCategoryError);
		});

		it('should throw InvalidBreakActivityCategoryError for non-string categories', () => {
			expect(() => validateBreakActivityCategory(null)).toThrow(InvalidBreakActivityCategoryError);
			expect(() => validateBreakActivityCategory(undefined)).toThrow(
				InvalidBreakActivityCategoryError
			);
			expect(() => validateBreakActivityCategory(42)).toThrow(InvalidBreakActivityCategoryError);
		});
	});

	describe('validateBreakActivityDuration', () => {
		it('should default to 5 if undefined', () => {
			expect(validateBreakActivityDuration(undefined)).toBe(5);
		});

		it('should accept valid positive integers >= 1', () => {
			expect(validateBreakActivityDuration(1)).toBe(1);
			expect(validateBreakActivityDuration(5)).toBe(5);
			expect(validateBreakActivityDuration(15)).toBe(15);
		});

		it('should throw InvalidBreakActivityDurationError for non-integers, numbers < 1, or non-numbers', () => {
			expect(() => validateBreakActivityDuration(0)).toThrow(InvalidBreakActivityDurationError);
			expect(() => validateBreakActivityDuration(-1)).toThrow(InvalidBreakActivityDurationError);
			expect(() => validateBreakActivityDuration(2.5)).toThrow(InvalidBreakActivityDurationError);
			expect(() => validateBreakActivityDuration(NaN)).toThrow(InvalidBreakActivityDurationError);
			expect(() => validateBreakActivityDuration('5')).toThrow(InvalidBreakActivityDurationError);
			expect(() => validateBreakActivityDuration(null)).toThrow(InvalidBreakActivityDurationError);
		});
	});

	describe('validateBreakActivityGuide', () => {
		it('should return undefined if guide is undefined or null', () => {
			expect(validateBreakActivityGuide(undefined)).toBeUndefined();
			expect(validateBreakActivityGuide(null)).toBeUndefined();
		});

		it('should return undefined if guide is empty or whitespace only', () => {
			expect(validateBreakActivityGuide('')).toBeUndefined();
			expect(validateBreakActivityGuide('   ')).toBeUndefined();
		});

		it('should trim valid guide string up to 500 characters', () => {
			const guide = '  1. Stand up\n2. Stretch arms  ';
			expect(validateBreakActivityGuide(guide)).toBe('1. Stand up\n2. Stretch arms');

			const maxGuide = 'g'.repeat(BREAK_ACTIVITY_GUIDE_MAX_LENGTH);
			expect(validateBreakActivityGuide(maxGuide)).toBe(maxGuide);
		});

		it('should throw InvalidBreakActivityGuideError if exceeding 500 characters', () => {
			const tooLong = 'g'.repeat(BREAK_ACTIVITY_GUIDE_MAX_LENGTH + 1);
			expect(() => validateBreakActivityGuide(tooLong)).toThrow(InvalidBreakActivityGuideError);
		});

		it('should throw InvalidBreakActivityGuideError if not a string', () => {
			expect(() => validateBreakActivityGuide(123)).toThrow(InvalidBreakActivityGuideError);
			expect(() => validateBreakActivityGuide(true)).toThrow(InvalidBreakActivityGuideError);
			expect(() => validateBreakActivityGuide({})).toThrow(InvalidBreakActivityGuideError);
		});
	});

	describe('validateBreakActivityId', () => {
		it('should trim valid non-empty string ID', () => {
			expect(validateBreakActivityId('  custom-id-123  ')).toBe('custom-id-123');
		});

		it('should throw InvalidBreakActivityIdError if empty or whitespace only', () => {
			expect(() => validateBreakActivityId('')).toThrow(InvalidBreakActivityIdError);
			expect(() => validateBreakActivityId('   ')).toThrow(InvalidBreakActivityIdError);
		});

		it('should throw InvalidBreakActivityIdError if not a string', () => {
			expect(() => validateBreakActivityId(null)).toThrow(InvalidBreakActivityIdError);
			expect(() => validateBreakActivityId(undefined)).toThrow(InvalidBreakActivityIdError);
			expect(() => validateBreakActivityId(123)).toThrow(InvalidBreakActivityIdError);
		});
	});

	describe('createBreakActivity factory', () => {
		it('should create a valid BreakActivity with default values', () => {
			const activity = createBreakActivity({
				title: 'Breathe deeply',
				category: 'mindful'
			});

			expect(activity.id).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
			);
			expect(activity.title).toBe('Breathe deeply');
			expect(activity.category).toBe('mindful');
			expect(activity.durationMinutes).toBe(5);
			expect(activity.isPreset).toBe(false);
			expect(activity.guide).toBeUndefined();
		});

		it('should create an activity with custom fields and trimmed guide', () => {
			const activity = createBreakActivity({
				id: 'custom-id',
				title: '  Drink cold water  ',
				category: 'hydration',
				durationMinutes: 2,
				isPreset: true,
				guide: '  1. Fill glass\n2. Drink slowly  '
			});

			expect(activity.id).toBe('custom-id');
			expect(activity.title).toBe('Drink cold water');
			expect(activity.category).toBe('hydration');
			expect(activity.durationMinutes).toBe(2);
			expect(activity.isPreset).toBe(true);
			expect(activity.guide).toBe('1. Fill glass\n2. Drink slowly');
		});

		it('should return an immutable (frozen) object', () => {
			const activity = createBreakActivity({
				title: 'Quick stretch',
				category: 'physical'
			});

			expect(Object.isFrozen(activity)).toBe(true);
			expect(() => {
				// @ts-expect-error verifying runtime immutability
				activity.title = 'New title';
			}).toThrow();
		});

		it('should throw when params is not an object', () => {
			// @ts-expect-error verifying invalid invocation
			expect(() => createBreakActivity(null)).toThrow(InvalidBreakActivityTitleError);
			// @ts-expect-error verifying invalid invocation
			expect(() => createBreakActivity(undefined)).toThrow(InvalidBreakActivityTitleError);
		});
	});

	describe('PRESET_BREAK_ACTIVITIES', () => {
		it('should be a frozen array containing frozen objects', () => {
			expect(Object.isFrozen(PRESET_BREAK_ACTIVITIES)).toBe(true);
			expect(PRESET_BREAK_ACTIVITIES.every(Object.isFrozen)).toBe(true);
		});

		it('should contain exactly 10 preset activities', () => {
			expect(PRESET_BREAK_ACTIVITIES).toHaveLength(10);
		});

		it('should have 4 physical, 4 mindful, and 2 hydration activities', () => {
			const physical = PRESET_BREAK_ACTIVITIES.filter((a) => a.category === 'physical');
			const mindful = PRESET_BREAK_ACTIVITIES.filter((a) => a.category === 'mindful');
			const hydration = PRESET_BREAK_ACTIVITIES.filter((a) => a.category === 'hydration');

			expect(physical).toHaveLength(4);
			expect(mindful).toHaveLength(4);
			expect(hydration).toHaveLength(2);
		});

		it('should have isPreset: true for all items', () => {
			expect(PRESET_BREAK_ACTIVITIES.every((a) => a.isPreset === true)).toBe(true);
		});

		it('should have durations between 1 and 5 minutes for all items', () => {
			for (const activity of PRESET_BREAK_ACTIVITIES) {
				expect(activity.durationMinutes).toBeGreaterThanOrEqual(1);
				expect(activity.durationMinutes).toBeLessThanOrEqual(5);
			}
		});

		it('should have actionable non-empty guides under 500 characters for all presets', () => {
			for (const activity of PRESET_BREAK_ACTIVITIES) {
				expect(typeof activity.guide).toBe('string');
				expect(activity.guide!.length).toBeGreaterThan(10);
				expect(activity.guide!.length).toBeLessThanOrEqual(BREAK_ACTIVITY_GUIDE_MAX_LENGTH);
				// Micro-guides have at least 2 numbered steps
				expect(activity.guide).toMatch(/1\..+2\./s);
			}
		});

		it('should have unique IDs for all presets', () => {
			const ids = PRESET_BREAK_ACTIVITIES.map((a) => a.id);
			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(PRESET_BREAK_ACTIVITIES.length);
		});
	});

	describe('pickNextBreakActivity', () => {
		const act1: BreakActivity = createBreakActivity({
			id: 'act-1',
			title: 'Activity 1',
			category: 'physical',
			durationMinutes: 2
		});

		const act2: BreakActivity = createBreakActivity({
			id: 'act-2',
			title: 'Activity 2',
			category: 'mindful',
			durationMinutes: 5
		});

		const act3: BreakActivity = createBreakActivity({
			id: 'act-3',
			title: 'Activity 3',
			category: 'hydration',
			durationMinutes: 3
		});

		it('should return null when activities list is empty', () => {
			expect(pickNextBreakActivity([])).toBeNull();
			// @ts-expect-error verifying fallback with nullish input
			expect(pickNextBreakActivity(null)).toBeNull();
			// @ts-expect-error verifying fallback with nullish input
			expect(pickNextBreakActivity(undefined)).toBeNull();
		});

		it('should filter candidates by maxDurationMinutes', () => {
			const activities = [act1, act2, act3]; // durations: 2, 5, 3
			// Filter max 2 minutes: only act1 matches
			const selected = pickNextBreakActivity(activities, null, 2);
			expect(selected).toBe(act1);

			// Filter max 4 minutes: act1 (2) and act3 (3) match, never act2 (5)
			for (let i = 0; i < 20; i++) {
				const result = pickNextBreakActivity(activities, null, 4);
				expect(result).not.toBeNull();
				expect(result!.durationMinutes).toBeLessThanOrEqual(4);
				expect(result!.id).not.toBe('act-2');
			}
		});

		it('should return null if no candidate matches maxDurationMinutes', () => {
			const activities = [act1, act2, act3]; // durations: 2, 5, 3
			const selected = pickNextBreakActivity(activities, null, 1);
			expect(selected).toBeNull();
		});

		it('should exclude previousId when candidates count > 1 (no repeats)', () => {
			const activities = [act1, act2];
			// With previousId = 'act-1', candidates count is 2 -> must return act2
			for (let i = 0; i < 20; i++) {
				const selected = pickNextBreakActivity(activities, 'act-1');
				expect(selected?.id).toBe('act-2');
			}

			// With previousId = 'act-2', must return act1
			for (let i = 0; i < 20; i++) {
				const selected = pickNextBreakActivity(activities, 'act-2');
				expect(selected?.id).toBe('act-1');
			}
		});

		it('should never select previousId from multiple candidates', () => {
			const activities = [act1, act2, act3];
			for (let i = 0; i < 30; i++) {
				const selected = pickNextBreakActivity(activities, 'act-2');
				expect(selected).not.toBeNull();
				expect(selected!.id).not.toBe('act-2');
			}
		});

		it('should fall back gracefully to previousId when it is the single available candidate', () => {
			const singleList = [act1];
			const selected = pickNextBreakActivity(singleList, 'act-1');
			expect(selected).toBe(act1);
		});

		it('should fall back gracefully when all candidates match previousId', () => {
			const duplicateIdList = [act1, act1];
			const selected = pickNextBreakActivity(duplicateIdList, 'act-1');
			expect(selected).toBe(act1);
		});

		it('should pick candidate when previousId is null, undefined, or empty', () => {
			const activities = [act1, act2];
			expect(pickNextBreakActivity(activities, null)).not.toBeNull();
			expect(pickNextBreakActivity(activities, undefined)).not.toBeNull();
			expect(pickNextBreakActivity(activities, '')).not.toBeNull();
		});

		it('should support deterministic selection with custom randomFn', () => {
			const activities = [act1, act2, act3];
			// randomFn returning 0 selects first candidate
			const first = pickNextBreakActivity(activities, null, undefined, () => 0);
			expect(first).toBe(act1);

			// randomFn returning 0.999 selects last candidate
			const last = pickNextBreakActivity(activities, null, undefined, () => 0.999);
			expect(last).toBe(act3);
		});
	});
});
