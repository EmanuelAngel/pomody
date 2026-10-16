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
