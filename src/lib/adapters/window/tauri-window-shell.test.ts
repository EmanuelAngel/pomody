import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
	MAIN_WINDOW_DIMENSIONS,
	MAIN_WINDOW_MIN_DIMENSIONS,
	MINI_WINDOW_DIMENSIONS,
	MINI_WINDOW_MIN_DIMENSIONS
} from '$lib/domain/ports/window-shell.port';
import {
	TauriWindowShell,
	isTauriRuntimeAvailable,
	type TauriWindowClientLike
} from './tauri-window-shell';

interface CallLog {
	readonly order: string[];
	readonly sizes: { width: number; height: number }[];
	readonly alwaysOnTop: boolean[];
}

function createSpyClient(supported = true): {
	client: TauriWindowClientLike;
	log: CallLog;
} {
	const order: string[] = [];
	const sizes: { width: number; height: number }[] = [];
	const alwaysOnTop: boolean[] = [];
	let currentAlwaysOnTop = false;

	const client: TauriWindowClientLike = {
		async setMinSize(dimensions) {
			order.push('setMinSize');
			sizes.push({ ...dimensions });
		},
		async setSize(dimensions) {
			order.push('setSize');
			sizes.push({ ...dimensions });
		},
		async setAlwaysOnTop(value) {
			order.push('setAlwaysOnTop');
			alwaysOnTop.push(value);
			currentAlwaysOnTop = value;
		},
		async isAlwaysOnTop() {
			order.push('isAlwaysOnTop');
			return currentAlwaysOnTop;
		}
	};

	return {
		client: supported ? client : client,
		log: { order, sizes, alwaysOnTop }
	};
}

describe('TauriWindowShell', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('isSupported', () => {
		it('should report support when a Tauri window client is injected', () => {
			const { client } = createSpyClient();

			expect(new TauriWindowShell(client).isSupported).toBe(true);
		});

		it('should report no support when no client is injected', () => {
			expect(new TauriWindowShell(null).isSupported).toBe(false);
		});
	});

	describe('enterMiniPlayer', () => {
		it('should lower minSize before setSize and enable always-on-top last', async () => {
			const { client, log } = createSpyClient();
			const shell = new TauriWindowShell(client);

			await shell.enterMiniPlayer();

			expect(log.order).toEqual(['setMinSize', 'setSize', 'setAlwaysOnTop']);
			expect(log.sizes).toEqual([MINI_WINDOW_MIN_DIMENSIONS, MINI_WINDOW_DIMENSIONS]);
			expect(log.alwaysOnTop).toEqual([true]);
		});

		it('should honour explicitly requested dimensions', async () => {
			const { client, log } = createSpyClient();
			const shell = new TauriWindowShell(client);

			await shell.enterMiniPlayer({ width: 320, height: 90 });

			expect(log.sizes).toEqual([MINI_WINDOW_MIN_DIMENSIONS, { width: 320, height: 90 }]);
		});

		it('should degrade without calling the client when unsupported', async () => {
			const { client, log } = createSpyClient();
			const shell = new TauriWindowShell(null);

			await expect(shell.enterMiniPlayer()).resolves.toBeUndefined();
			expect(log.order).toEqual([]);
			expect(shell.isSupported).toBe(false);
			void client;
		});
	});

	describe('restoreMainWindow', () => {
		it('should disable always-on-top, then raise minSize, then setSize', async () => {
			const { client, log } = createSpyClient();
			const shell = new TauriWindowShell(client);

			await shell.restoreMainWindow();

			expect(log.order).toEqual(['setAlwaysOnTop', 'setMinSize', 'setSize']);
			expect(log.alwaysOnTop).toEqual([false]);
			expect(log.sizes).toEqual([MAIN_WINDOW_MIN_DIMENSIONS, MAIN_WINDOW_DIMENSIONS]);
		});

		it('should degrade without calling the client when unsupported', async () => {
			const shell = new TauriWindowShell(null);

			await expect(shell.restoreMainWindow()).resolves.toBeUndefined();
		});
	});

	describe('isAlwaysOnTop', () => {
		it('should delegate to the injected client', async () => {
			const { client } = createSpyClient();
			const shell = new TauriWindowShell(client);

			await expect(shell.isAlwaysOnTop()).resolves.toBe(false);

			await shell.enterMiniPlayer();

			await expect(shell.isAlwaysOnTop()).resolves.toBe(true);
		});

		it('should resolve false without touching the client when unsupported', async () => {
			const { client, log } = createSpyClient();
			const shell = new TauriWindowShell(null);

			await expect(shell.isAlwaysOnTop()).resolves.toBe(false);
			expect(log.order).toEqual([]);
			void client;
		});
	});

	describe('Tauri runtime detection', () => {
		it('should detect the Tauri runtime only when __TAURI_INTERNALS__ is present', () => {
			expect(isTauriRuntimeAvailable()).toBe(false);

			vi.stubGlobal('__TAURI_INTERNALS__', { invoke: () => Promise.resolve(null) });

			expect(isTauriRuntimeAvailable()).toBe(true);
		});
	});

	describe('Lazy module boundary', () => {
		it('should never statically import @tauri-apps/api', () => {
			const source = readFileSync(
				fileURLToPath(new URL('./tauri-window-shell.ts', import.meta.url)),
				'utf8'
			);

			expect(source).not.toMatch(/^\s*import\s[^;]*['"]@tauri-apps/m);
			expect(source).toMatch(/import\(['"]@tauri-apps\/api\/window['"]\)/);
		});
	});
});
