import type { OpenWindow } from '../ports/distraction-monitor.port';

/**
 * A user-declared distraction. Rules are declarative only: no seed list, no heuristic
 * ever creates one (spec §2 P1).
 */
export interface DistractionRule {
	readonly id: string;
	/** Normalized executable: lowercase, without path or extension (`chrome`, `steam`). */
	readonly exe: string;
	/** Case-insensitive substring of the window title. Absent = the whole application. */
	readonly titlePattern?: string;
	readonly createdAt: number;
}

/**
 * Normalizes a raw executable path or name into the comparable key stored on a rule:
 * trimmed, lowercased, without any path prefix, and without the trailing `.exe` extension.
 */
export function normalizeExe(rawExecutablePath: string): string {
	const trimmed = rawExecutablePath.trim();
	if (trimmed.length === 0) {
		return '';
	}

	const basename = trimmed.split(/[\\/]/).pop() ?? trimmed;
	const withoutExtension = basename.toLowerCase().endsWith('.exe')
		? basename.slice(0, -'.exe'.length)
		: basename;

	return withoutExtension.toLowerCase();
}

/**
 * Matches a rule against an observed window, in this order (spec §3.3):
 * 1. the rule executable must equal the normalized observed executable;
 * 2. an absent title pattern matches any window of that application;
 * 3. a present pattern is compared as a case-insensitive substring of the title;
 * 4. an empty or whitespace-only pattern is treated as absent (whole application).
 */
export function matchesRule(rule: DistractionRule, observation: OpenWindow): boolean {
	if (rule.exe !== normalizeExe(observation.exe)) {
		return false;
	}

	const pattern = rule.titlePattern?.trim();

	if (pattern === undefined || pattern.length === 0) {
		return true;
	}

	return observation.title.toLowerCase().includes(pattern.toLowerCase());
}

/**
 * Defensive validation checking that raw input matches the DistractionRule shape:
 * - id: non-empty string, trimmed
 * - exe: string that normalizes to a non-empty executable key
 * - titlePattern: undefined, or a string trimmed to a non-empty substring
 * - createdAt: finite number > 0
 *
 * Returns a frozen DistractionRule or null if corrupt. The executable is always
 * normalized on the way in, so a sanitized rule always satisfies the entity invariant.
 *
 * Lives here, next to the invariant it enforces, so the persistence adapter and the
 * in-memory test fakes share one authority instead of two that can drift apart.
 */
export function sanitizeDistractionRule(raw: unknown): DistractionRule | null {
	if (typeof raw !== 'object' || raw === null) {
		return null;
	}

	const candidate = raw as Record<string, unknown>;

	if (typeof candidate.id !== 'string') {
		return null;
	}

	const trimmedId = candidate.id.trim();
	if (trimmedId.length === 0) {
		return null;
	}

	if (typeof candidate.exe !== 'string') {
		return null;
	}

	const exe = normalizeExe(candidate.exe);
	if (exe.length === 0) {
		return null;
	}

	let titlePattern: string | undefined = undefined;
	if (candidate.titlePattern !== undefined && candidate.titlePattern !== null) {
		if (typeof candidate.titlePattern !== 'string') {
			return null;
		}

		const trimmedPattern = candidate.titlePattern.trim();
		if (trimmedPattern.length > 0) {
			titlePattern = trimmedPattern;
		}
	}

	if (
		typeof candidate.createdAt !== 'number' ||
		!Number.isFinite(candidate.createdAt) ||
		candidate.createdAt <= 0
	) {
		return null;
	}

	const rule: DistractionRule = {
		id: trimmedId,
		exe,
		createdAt: candidate.createdAt,
		...(titlePattern !== undefined ? { titlePattern } : {})
	};

	return Object.freeze(rule);
}
