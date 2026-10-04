import { createBreakActivity, type BreakActivity } from '$lib/domain/breaks/break-activity.entity';

/**
 * Creates a valid BreakActivity fixture with sensible defaults.
 */
export function createBreakActivityFixture(
	overrides: Partial<Parameters<typeof createBreakActivity>[0]> = {}
): BreakActivity {
	return createBreakActivity({
		id: 'break-fixture-1',
		title: 'Desk Stretch',
		category: 'physical',
		durationMinutes: 5,
		isPreset: false,
		guide: 'Stretch neck and shoulders gently.',
		...overrides
	});
}

/**
 * Creates a frozen list of valid BreakActivity fixtures with sequential IDs.
 */
export function createBreakActivityListFixture(
	count: number,
	baseOverrides: Partial<Parameters<typeof createBreakActivity>[0]> = {}
): readonly BreakActivity[] {
	const activities: BreakActivity[] = [];

	for (let i = 0; i < count; i++) {
		const id = baseOverrides.id
			? count === 1
				? baseOverrides.id
				: `${baseOverrides.id}-${i + 1}`
			: `break-fixture-${i + 1}`;

		activities.push(
			createBreakActivityFixture({
				...baseOverrides,
				id
			})
		);
	}

	return Object.freeze(activities);
}
