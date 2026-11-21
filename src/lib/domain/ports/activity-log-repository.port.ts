import type {
	ActivityDetails,
	ActivityKind,
	ActivityLogEntry
} from '../activity/activity-log-entry.entity';

/** Where states report the user actions that do not travel as timer domain events. */
export interface IActivityRecorder {
	record(kind: ActivityKind, details?: ActivityDetails): void;
}

/**
 * Domain port for the activity trace. Read-only for the user: entries are only appended and
 * expire by retention, so there is no delete or edit.
 */
export interface IActivityLogRepository {
	/** Every stored entry in chronological order (`at` ascending). */
	getAll(): Promise<readonly ActivityLogEntry[]>;

	/** Adds one entry on top of what is stored, trimming what falls outside the retention window. */
	append(entry: ActivityLogEntry): Promise<void>;

	/** Notifies when another context (e.g. another tab) changed the stored log. */
	onExternalChange(listener: () => void): () => void;
}
