import { createHash } from 'node:crypto';

/** Keyword that selects the Chromium downloaded by Playwright instead of a system browser. */
export const BUNDLED_CHROMIUM = 'bundled';

/** Port `vite preview` uses by default, and the base of the E2E port range. */
export const DEFAULT_E2E_PORT = 4173;

/** Consecutive ports reserved so sibling worktrees rarely collide; `POMODY_E2E_PORT` pins one. */
export const E2E_PORT_SPAN = 1000;

/**
 * Single source of truth for the browser channel of both Playwright entry points:
 * Vitest Browser Mode (`vite.config.ts`) and E2E (`playwright.config.ts`).
 *
 * They used to disagree: E2E already degraded to the bundled Chromium in CI while
 * the browser project kept `channel: 'msedge'`, which cannot launch on a Linux
 * runner where Edge is not installed. Outside CI the default stays Edge because a
 * local Windows machine usually has it and not the Playwright-managed Chromium.
 *
 * `PLAYWRIGHT_CHANNEL` overrides both: any Playwright channel name (`msedge`,
 * `chrome`, ...) or `bundled` for the downloaded Chromium.
 */
export function resolveBrowserChannel(env: NodeJS.ProcessEnv = process.env): string | undefined {
	const explicit = env.PLAYWRIGHT_CHANNEL?.trim();
	if (explicit) {
		return explicit === BUNDLED_CHROMIUM ? undefined : explicit;
	}

	return env.CI && env.CI !== 'false' ? undefined : 'msedge';
}

/**
 * Port the E2E preview server listens on.
 *
 * A fixed port is shared by every worktree on the machine, so one worktree could
 * attach to another worktree's server and validate an artifact this branch never
 * built. The offset is derived from the working directory, which gives each
 * worktree its own stable port; `POMODY_E2E_PORT` pins an explicit one.
 */
export function resolveE2EPort(
	cwd: string = process.cwd(),
	env: NodeJS.ProcessEnv = process.env
): number {
	const explicit = env.POMODY_E2E_PORT?.trim();
	if (explicit) {
		const port = Number(explicit);
		if (!Number.isInteger(port) || port < 1 || port > 65535) {
			throw new Error(
				`POMODY_E2E_PORT must be an integer between 1 and 65535, received "${explicit}"`
			);
		}

		return port;
	}

	const digest = createHash('sha256').update(cwd).digest();

	return DEFAULT_E2E_PORT + (digest.readUInt16BE(0) % E2E_PORT_SPAN);
}
