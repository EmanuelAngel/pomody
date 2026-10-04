import {
	PRESET_BREAK_ACTIVITIES,
	type BreakActivity,
	type BreakCategory
} from '$lib/domain/breaks/break-activity.entity';
import {
	type IBreakActivityRepository,
	sortBreakActivities
} from '$lib/domain/ports/break-activity-repository.port';

/**
 * In-memory test fake implementing IBreakActivityRepository.
 * Defaults to catalog presets when constructor argument is omitted/undefined.
 * Uses sortBreakActivities for deterministic ordering.
 */
export class FakeBreakActivityRepository implements IBreakActivityRepository {
	private readonly activities = new Map<string, BreakActivity>();

	constructor(initialActivities?: readonly BreakActivity[]) {
		const seed = initialActivities !== undefined ? initialActivities : PRESET_BREAK_ACTIVITIES;
		for (const activity of seed) {
			this.activities.set(activity.id, activity);
		}
	}

	async getAll(): Promise<readonly BreakActivity[]> {
		return sortBreakActivities(Array.from(this.activities.values()));
	}

	async getByCategory(category: BreakCategory): Promise<readonly BreakActivity[]> {
		const filtered = Array.from(this.activities.values()).filter(
			(activity) => activity.category === category
		);
		return sortBreakActivities(filtered);
	}

	async save(activity: BreakActivity): Promise<void> {
		this.activities.set(activity.id, activity);
	}

	async delete(activityId: string): Promise<void> {
		this.activities.delete(activityId);
	}

	async resetToDefaults(): Promise<void> {
		this.activities.clear();
		for (const activity of PRESET_BREAK_ACTIVITIES) {
			this.activities.set(activity.id, activity);
		}
	}

	async clearAll(): Promise<void> {
		this.activities.clear();
	}
}
