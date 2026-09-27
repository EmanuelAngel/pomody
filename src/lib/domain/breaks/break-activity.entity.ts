export const BREAK_ACTIVITY_TITLE_MAX_LENGTH = 120;
export const BREAK_ACTIVITY_GUIDE_MAX_LENGTH = 500;

export type BreakCategory = 'physical' | 'mindful' | 'hydration';

export const VALID_BREAK_CATEGORIES: readonly BreakCategory[] = [
	'physical',
	'mindful',
	'hydration'
] as const;

export class InvalidBreakActivityTitleError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'InvalidBreakActivityTitleError';
	}
}

export class InvalidBreakActivityGuideError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'InvalidBreakActivityGuideError';
	}
}

export class InvalidBreakActivityDurationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'InvalidBreakActivityDurationError';
	}
}

export class InvalidBreakActivityCategoryError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'InvalidBreakActivityCategoryError';
	}
}

export class InvalidBreakActivityIdError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'InvalidBreakActivityIdError';
	}
}

export interface BreakActivity {
	readonly id: string;
	readonly title: string;
	readonly category: BreakCategory;
	readonly durationMinutes: number;
	readonly isPreset: boolean;
	readonly guide?: string;
}

export interface CreateBreakActivityParams {
	readonly id?: string;
	readonly title: string;
	readonly category: BreakCategory;
	readonly durationMinutes?: number;
	readonly isPreset?: boolean;
	readonly guide?: string;
}

/**
 * Generates an RFC 4122 v4 UUID.
 * In secure contexts (HTTPS/localhost), uses standard `crypto.randomUUID()`.
 * In non-secure contexts (e.g. HTTP LAN dev), falls back to an RFC 4122 v4 UUID generator.
 */
export function generateBreakActivityId(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}

	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

/**
 * Validates and trims a break activity title.
 * Throws InvalidBreakActivityTitleError if empty, invalid type, or exceeding max length.
 */
export function validateBreakActivityTitle(title: unknown): string {
	if (typeof title !== 'string') {
		throw new InvalidBreakActivityTitleError('Break activity title must be a string.');
	}

	const trimmed = title.trim();

	if (trimmed.length === 0) {
		throw new InvalidBreakActivityTitleError('Break activity title cannot be empty.');
	}

	if (trimmed.length > BREAK_ACTIVITY_TITLE_MAX_LENGTH) {
		throw new InvalidBreakActivityTitleError(
			`Break activity title cannot exceed ${BREAK_ACTIVITY_TITLE_MAX_LENGTH} characters.`
		);
	}

	return trimmed;
}

/**
 * Validates the category against permitted BreakCategory literals.
 */
export function validateBreakActivityCategory(category: unknown): BreakCategory {
	if (typeof category !== 'string' || !VALID_BREAK_CATEGORIES.includes(category as BreakCategory)) {
		throw new InvalidBreakActivityCategoryError(
			'Break activity category must be one of: physical, mindful, hydration.'
		);
	}

	return category as BreakCategory;
}

/**
 * Validates break activity duration in minutes.
 * Must be an integer >= 1. Defaults to 5 if undefined.
 */
export function validateBreakActivityDuration(durationMinutes: unknown): number {
	if (durationMinutes === undefined) {
		return 5;
	}

	if (
		typeof durationMinutes !== 'number' ||
		!Number.isInteger(durationMinutes) ||
		durationMinutes < 1
	) {
		throw new InvalidBreakActivityDurationError(
			'Break activity duration must be an integer greater than or equal to 1 minute.'
		);
	}

	return durationMinutes;
}

/**
 * Validates and trims an optional break activity guide.
 * Returns undefined if not provided or empty after trim.
 * Throws InvalidBreakActivityGuideError if not a string or exceeding max length.
 */
export function validateBreakActivityGuide(guide: unknown): string | undefined {
	if (guide === undefined || guide === null) {
		return undefined;
	}

	if (typeof guide !== 'string') {
		throw new InvalidBreakActivityGuideError('Break activity guide must be a string.');
	}

	const trimmed = guide.trim();

	if (trimmed.length === 0) {
		return undefined;
	}

	if (trimmed.length > BREAK_ACTIVITY_GUIDE_MAX_LENGTH) {
		throw new InvalidBreakActivityGuideError(
			`Break activity guide cannot exceed ${BREAK_ACTIVITY_GUIDE_MAX_LENGTH} characters.`
		);
	}

	return trimmed;
}

/**
 * Validates a break activity ID.
 * Throws InvalidBreakActivityIdError if not a non-empty string.
 */
export function validateBreakActivityId(id: unknown): string {
	if (typeof id !== 'string') {
		throw new InvalidBreakActivityIdError('Break activity ID must be a string.');
	}

	const trimmed = id.trim();

	if (trimmed.length === 0) {
		throw new InvalidBreakActivityIdError('Break activity ID cannot be empty.');
	}

	return trimmed;
}

/**
 * Creates an immutable BreakActivity instance.
 */
export function createBreakActivity(params: CreateBreakActivityParams): BreakActivity {
	if (!params || typeof params !== 'object') {
		throw new InvalidBreakActivityTitleError('Break activity params must be an object.');
	}

	const title = validateBreakActivityTitle(params.title);
	const category = validateBreakActivityCategory(params.category);
	const durationMinutes = validateBreakActivityDuration(params.durationMinutes);
	const guide = validateBreakActivityGuide(params.guide);

	let id: string;
	if (params.id !== undefined) {
		id = validateBreakActivityId(params.id);
	} else {
		id = generateBreakActivityId();
	}

	const activity: BreakActivity = {
		id,
		title,
		category,
		durationMinutes,
		isPreset: params.isPreset === true,
		...(guide !== undefined ? { guide } : {})
	};

	return Object.freeze(activity);
}

/**
 * Curated seed list of 10 frozen preset break activities:
 * - 4 physical
 * - 4 mindful
 * - 2 hydration
 * All with 2-3 step micro-guides, durations 1-5 minutes, and isPreset: true.
 */
export const PRESET_BREAK_ACTIVITIES: readonly BreakActivity[] = Object.freeze([
	createBreakActivity({
		id: 'preset-neck-shoulder-stretch',
		title: 'Neck & Shoulder Release',
		category: 'physical',
		durationMinutes: 2,
		isPreset: true,
		guide:
			'1. Gently tilt your right ear to your right shoulder for 30s.\n2. Repeat on the left side.\n3. Roll your shoulders backward in slow circles 5 times.'
	}),
	createBreakActivity({
		id: 'preset-wrist-forearm-relief',
		title: 'Wrist & Forearm Stretch',
		category: 'physical',
		durationMinutes: 2,
		isPreset: true,
		guide:
			'1. Extend one arm forward with palm up and gently pull fingers down.\n2. Flip palm down and press back gently for 20s.\n3. Shake out both hands and repeat on other arm.'
	}),
	createBreakActivity({
		id: 'preset-standing-backbend-reach',
		title: 'Standing Backbend & Reach',
		category: 'physical',
		durationMinutes: 3,
		isPreset: true,
		guide:
			'1. Stand up and place your hands on your lower back.\n2. Gently arch backward while opening your chest and breathing deeply.\n3. Reach your arms high overhead and lengthen your spine.'
	}),
	createBreakActivity({
		id: 'preset-quick-room-stroll',
		title: 'Quick Room Stroll',
		category: 'physical',
		durationMinutes: 5,
		isPreset: true,
		guide:
			'1. Step away from your desk and walk around your room or hallway.\n2. Swing your arms loosely to stimulate blood flow.\n3. Roll your ankles and shake out your legs before sitting down.'
	}),
	createBreakActivity({
		id: 'preset-box-breathing',
		title: 'Box Breathing Focus',
		category: 'mindful',
		durationMinutes: 3,
		isPreset: true,
		guide:
			'1. Inhale deeply through your nose for 4 seconds.\n2. Hold your breath for 4 seconds.\n3. Exhale smoothly for 4 seconds and hold empty for 4 seconds. Repeat 4 times.'
	}),
	createBreakActivity({
		id: 'preset-20-20-20-eye-rest',
		title: '20-20-20 Eye Rest',
		category: 'mindful',
		durationMinutes: 1,
		isPreset: true,
		guide:
			'1. Look away from your screen toward an object at least 20 feet away.\n2. Keep your gaze relaxed on that distant point for 20 seconds.\n3. Blink slowly several times to re-moisturize your eyes.'
	}),
	createBreakActivity({
		id: 'preset-sensory-grounding',
		title: '5-4-3-2-1 Sensory Grounding',
		category: 'mindful',
		durationMinutes: 3,
		isPreset: true,
		guide:
			'1. Silently notice 3 things you can see around you.\n2. Notice 2 physical sensations you can feel.\n3. Notice 1 sound in your environment and take a deep breath.'
	}),
	createBreakActivity({
		id: 'preset-mental-reset',
		title: 'Mental Reset & Reflection',
		category: 'mindful',
		durationMinutes: 2,
		isPreset: true,
		guide:
			'1. Close your eyes and let your shoulders drop away from your ears.\n2. Recall one small win or positive aspect from your work so far.\n3. Set a clear, calm intention for your next focus block.'
	}),
	createBreakActivity({
		id: 'preset-glass-of-water',
		title: 'Hydrate with Fresh Water',
		category: 'hydration',
		durationMinutes: 1,
		isPreset: true,
		guide:
			'1. Pour a full glass of cool or room-temperature water.\n2. Drink slowly across several mindful sips.\n3. Refill your bottle or cup so it is ready for your next session.'
	}),
	createBreakActivity({
		id: 'preset-mindful-herbal-tea',
		title: 'Mindful Herbal Tea',
		category: 'hydration',
		durationMinutes: 4,
		isPreset: true,
		guide:
			'1. Prepare a cup of hot water with herbal tea or lemon.\n2. Inhale the aroma and feel the warmth between your hands.\n3. Sip slowly without looking at screens.'
	})
]);

/**
 * Pure selection function that picks a break activity.
 * - Filters candidates by maxDurationMinutes if provided.
 * - If candidates.length > 1, excludes previousId.
 * - If previousId is the only option or no candidate found after exclusion, falls back gracefully.
 * - Returns null if activities is empty.
 */
export function pickNextBreakActivity(
	activities: readonly BreakActivity[],
	previousId?: string | null,
	maxDurationMinutes?: number,
	randomFn: () => number = Math.random
): BreakActivity | null {
	if (!activities || activities.length === 0) {
		return null;
	}

	const candidates =
		typeof maxDurationMinutes === 'number'
			? activities.filter((activity) => activity.durationMinutes <= maxDurationMinutes)
			: [...activities];

	if (candidates.length === 0) {
		return null;
	}

	let pool = candidates;
	if (previousId && candidates.length > 1) {
		const filtered = candidates.filter((activity) => activity.id !== previousId);
		if (filtered.length > 0) {
			pool = filtered;
		}
	}

	const index = Math.floor(randomFn() * pool.length);
	return pool[index] ?? null;
}
