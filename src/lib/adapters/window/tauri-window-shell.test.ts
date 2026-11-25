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
	readonly decorations: boolean[];
	readonly resizable: boolean[];
}

/**
 * Handles the native behaviour the spy client cannot drive by itself:
 * OS-reported state changes (maximize through Win+Up) and failed subscriptions.
 */
interface SpyControls {
	/** Simulates a maximize/restore the OS performed behind the app's back. */
	setMaximizedExternally(value: boolean): void;
	/** Fires the native resize event every subscriber received. */
	emitResize(): Promise<void>;
	/** Number of times a resize subscription has been detached. */
	unlistenCount(): number;
	/** Makes the next `onResized` call reject, as a missing permission would. */
	rejectNextResizeSubscription(): void;
	/** Makes the next `isMaximized` read reject, as a failing native call would. */
	failNextMaximizedRead(): void;
}

function createSpyClient(): {
	client: TauriWindowClientLike;
	log: CallLog;
	controls: SpyControls;
} {
	const order: string[] = [];
	const sizes: { width: number; height: number }[] = [];
	const alwaysOnTop: boolean[] = [];
	const decorations: boolean[] = [];
	const resizable: boolean[] = [];
	const resizeHandlers: (() => void)[] = [];
	let resizeUnlistenCount = 0;
	let rejectNextSubscription = false;
	let failNextMaximized = false;
	let currentAlwaysOnTop = false;
	let currentMaximized = false;

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
		async setDecorations(value) {
			order.push('setDecorations');
			decorations.push(value);
		},
		async setResizable(value) {
			order.push('setResizable');
			resizable.push(value);
		},
		async center() {
			order.push('center');
		},
		async isAlwaysOnTop() {
			order.push('isAlwaysOnTop');
			return currentAlwaysOnTop;
		},
		async minimize() {
			order.push('minimize');
		},
		async toggleMaximize() {
			order.push('toggleMaximize');
			currentMaximized = !currentMaximized;
		},
		async close() {
			order.push('close');
		},
		async isMaximized() {
			order.push('isMaximized');

			if (failNextMaximized) {
				failNextMaximized = false;
				throw new Error('native call failed');
			}

			return currentMaximized;
		},
		async onResized(handler) {
			order.push('onResized');

			if (rejectNextSubscription) {
				rejectNextSubscription = false;
				throw new Error('core:event:allow-listen missing');
			}

			resizeHandlers.push(handler);

			return () => {
				resizeUnlistenCount++;
				const index = resizeHandlers.indexOf(handler);
				if (index >= 0) resizeHandlers.splice(index, 1);
			};
		}
	};

	const controls: SpyControls = {
		setMaximizedExternally(value) {
			currentMaximized = value;
		},
		async emitResize() {
			for (const handler of [...resizeHandlers]) handler();
			// A resize handler reads the state asynchronously; flush the microtasks
			// it queued so the assertion sees the notification it produced.
			await new Promise((resolve) => setTimeout(resolve, 0));
		},
		unlistenCount() {
			return resizeUnlistenCount;
		},
		rejectNextResizeSubscription() {
			rejectNextSubscription = true;
		},
		failNextMaximizedRead() {
			failNextMaximized = true;
		}
	};

	return {
		client,
		log: { order, sizes, alwaysOnTop, decorations, resizable },
		controls
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
		it('should remove decorations before resizing, and lock resizable last-but-one', async () => {
			const { client, log } = createSpyClient();
			const shell = new TauriWindowShell(client);

			await shell.enterMiniPlayer();

			expect(log.order).toEqual([
				'setDecorations',
				'setMinSize',
				'setSize',
				'setResizable',
				'setAlwaysOnTop'
			]);
			expect(log.sizes).toEqual([MINI_WINDOW_MIN_DIMENSIONS, MINI_WINDOW_DIMENSIONS]);
			expect(log.alwaysOnTop).toEqual([true]);
		});

		it('should make the window frameless and non-resizable', async () => {
			const { client, log } = createSpyClient();
			const shell = new TauriWindowShell(client);

			await shell.enterMiniPlayer();

			expect(log.decorations).toEqual([false]);
			expect(log.resizable).toEqual([false]);
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
		it('should restore the main dimensions without bringing the native bar back', async () => {
			const { client, log } = createSpyClient();
			const shell = new TauriWindowShell(client);

			await shell.restoreMainWindow();

			// The main window is frameless for good (tauri.conf.json). Restoring
			// decorations here would reintroduce the native title bar on top of the
			// custom strip, so the restore path must never call setDecorations.
			expect(log.order).toEqual([
				'setAlwaysOnTop',
				'setResizable',
				'setMinSize',
				'setSize',
				'center'
			]);
			expect(log.alwaysOnTop).toEqual([false]);
			expect(log.sizes).toEqual([MAIN_WINDOW_MIN_DIMENSIONS, MAIN_WINDOW_DIMENSIONS]);
			expect(log.decorations).toEqual([]);
		});

		it('should centre the restored window on the primary display', async () => {
			const { client, log } = createSpyClient();
			const shell = new TauriWindowShell(client);

			await shell.restoreMainWindow();

			// `center` centres the CURRENT size, so it must run after the final
			// resize. Centring first would centre the 320x48 compact box and then
			// grow it to 800x682 from that origin, leaving it off-centre.
			expect(log.order.indexOf('center')).toBe(log.order.length - 1);
			expect(log.order.indexOf('center')).toBeGreaterThan(log.order.indexOf('setSize'));
		});

		it('should re-enable resizing', async () => {
			const { client, log } = createSpyClient();
			const shell = new TauriWindowShell(client);

			await shell.restoreMainWindow();

			expect(log.resizable).toEqual([true]);
		});

		it('should leave the window frameless after a full mini-player round trip', async () => {
			const { client, log } = createSpyClient();
			const shell = new TauriWindowShell(client);

			await shell.enterMiniPlayer();
			await shell.restoreMainWindow();

			// Only enterMiniPlayer may touch decorations, and it only ever strips
			// them: the native bar must not come back on exit.
			expect(log.decorations).toEqual([false]);
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

	describe('minimize', () => {
		it('should minimize the native window', async () => {
			const { client, log } = createSpyClient();
			const shell = new TauriWindowShell(client);

			await shell.minimize();

			expect(log.order).toEqual(['minimize']);
		});

		it('should degrade without calling the client when unsupported', async () => {
			const { log } = createSpyClient();
			const shell = new TauriWindowShell(null);

			await expect(shell.minimize()).resolves.toBeUndefined();
			expect(log.order).toEqual([]);
		});
	});

	describe('toggleMaximize', () => {
		it('should delegate the maximize/restore toggle to the native window', async () => {
			const { client, log } = createSpyClient();
			const shell = new TauriWindowShell(client);

			await shell.toggleMaximize();

			expect(log.order).toEqual(['toggleMaximize']);
		});

		it('should degrade without calling the client when unsupported', async () => {
			const { log } = createSpyClient();
			const shell = new TauriWindowShell(null);

			await expect(shell.toggleMaximize()).resolves.toBeUndefined();
			expect(log.order).toEqual([]);
		});
	});

	describe('close', () => {
		it('should request a native close on the window', async () => {
			const { client, log } = createSpyClient();
			const shell = new TauriWindowShell(client);

			await shell.close();

			// Rust turns this request into hide-to-tray (`prevent_close` + `hide`),
			// so the adapter only has to ask for a close and never terminates the app
			// on its own.
			expect(log.order).toEqual(['close']);
		});

		it('should degrade without calling the client when unsupported', async () => {
			const { log } = createSpyClient();
			const shell = new TauriWindowShell(null);

			await expect(shell.close()).resolves.toBeUndefined();
			expect(log.order).toEqual([]);
		});
	});

	describe('isMaximized', () => {
		it('should delegate to the injected client', async () => {
			const { client, controls } = createSpyClient();
			const shell = new TauriWindowShell(client);

			await expect(shell.isMaximized()).resolves.toBe(false);

			controls.setMaximizedExternally(true);

			await expect(shell.isMaximized()).resolves.toBe(true);
		});

		it('should resolve false without touching the client when unsupported', async () => {
			const { log } = createSpyClient();
			const shell = new TauriWindowShell(null);

			await expect(shell.isMaximized()).resolves.toBe(false);
			expect(log.order).toEqual([]);
		});
	});

	describe('onMaximizedChange', () => {
		it('should report an OS-driven maximize and restore', async () => {
			const { client, controls } = createSpyClient();
			const shell = new TauriWindowShell(client);
			const seen: boolean[] = [];

			await shell.onMaximizedChange((maximized) => seen.push(maximized));

			controls.setMaximizedExternally(true);
			await controls.emitResize();
			controls.setMaximizedExternally(false);
			await controls.emitResize();

			expect(seen).toEqual([true, false]);
		});

		it('should subscribe through the native resize event', async () => {
			const { client, log } = createSpyClient();
			const shell = new TauriWindowShell(client);

			await shell.onMaximizedChange(() => {});

			// Maximizing has no dedicated event in Tauri v2: the adapter listens to
			// resize and re-reads `isMaximized`, seeding the last value on subscribe so
			// the first notification is a real change.
			expect(log.order).toEqual(['isMaximized', 'onResized']);
		});

		it('should stay silent on a resize that leaves the state unchanged', async () => {
			const { client, controls } = createSpyClient();
			const shell = new TauriWindowShell(client);
			const seen: boolean[] = [];

			await shell.onMaximizedChange((maximized) => seen.push(maximized));
			await controls.emitResize();

			expect(seen).toEqual([]);
		});

		it('should stop reporting after the unsubscribe runs', async () => {
			const { client, controls } = createSpyClient();
			const shell = new TauriWindowShell(client);
			const seen: boolean[] = [];

			const unsubscribe = await shell.onMaximizedChange((maximized) => seen.push(maximized));
			unsubscribe();
			controls.setMaximizedExternally(true);
			await controls.emitResize();

			expect(seen).toEqual([]);
			expect(controls.unlistenCount()).toBe(1);
		});

		it('should return a no-op unsubscribe when unsupported', async () => {
			const { log } = createSpyClient();
			const shell = new TauriWindowShell(null);

			const unsubscribe = await shell.onMaximizedChange(() => {});

			expect(log.order).toEqual([]);
			expect(() => unsubscribe()).not.toThrow();
		});

		it('should survive a failing state read after a resize', async () => {
			// The resize listener runs outside any caller's await chain, so a failing
			// native read would surface as an unhandled rejection and take the state
			// observer down with it. It is swallowed instead.
			const { client, controls } = createSpyClient();
			const shell = new TauriWindowShell(client);
			const seen: boolean[] = [];

			await shell.onMaximizedChange((maximized) => seen.push(maximized));
			controls.failNextMaximizedRead();
			await controls.emitResize();

			expect(seen).toEqual([]);
		});

		it('should degrade to a no-op unsubscribe when the subscription fails', async () => {
			// A missing `core:event:allow-listen` makes `listen` reject. A dead
			// subscription must not reject into the caller's effect, so the adapter
			// resolves with an unsubscribe instead.
			const { client, controls } = createSpyClient();
			const shell = new TauriWindowShell(client);

			controls.rejectNextResizeSubscription();
			const unsubscribe = await shell.onMaximizedChange(() => {});

			expect(typeof unsubscribe).toBe('function');
			expect(() => unsubscribe()).not.toThrow();
		});
	});

	describe('Tauri capability permissions', () => {
		function readCapabilities(): { permissions: string[] } {
			return JSON.parse(
				readFileSync(
					fileURLToPath(
						new URL('../../../../src-tauri/capabilities/default.json', import.meta.url)
					),
					'utf8'
				)
			);
		}

		it('should grant every native command the adapter calls', () => {
			// `data-tauri-drag-region` is implemented by invoking the `start_dragging`
			// command. It is NOT part of `core:window:default`, so without this
			// permission every drag region in the app is silently inert.
			expect(readCapabilities().permissions).toContain('core:window:allow-start-dragging');
		});

		it('should grant the compact-mode chrome permissions', () => {
			const { permissions } = readCapabilities();

			// `set-decorations` is still called: entering the Mini-Player strips the
			// decorations explicitly. Only the restore path gave that call up.
			expect(permissions).toContain('core:window:allow-set-decorations');
			expect(permissions).toContain('core:window:allow-set-resizable');
		});

		it('should grant the permission to recentre the restored window', () => {
			// Restoring leaves the window wherever the compact widget was dragged,
			// which can be partly off-screen. `center` is a separate command from
			// `setPosition`, so it needs its own permission.
			expect(readCapabilities().permissions).toContain('core:window:allow-center');
		});

		it('should grant the custom window control permissions', () => {
			const { permissions } = readCapabilities();

			expect(permissions).toContain('core:window:allow-minimize');
			expect(permissions).toContain('core:window:allow-toggle-maximize');
			expect(permissions).toContain('core:window:allow-close');
			expect(permissions).toContain('core:window:allow-is-maximized');
		});

		it('should grant the event permission the maximized-state subscription needs', () => {
			// `onResized` is `listen` on the window events, which is not covered by
			// `core:window:default`.
			expect(readCapabilities().permissions).toContain('core:event:allow-listen');
		});
	});

	describe('Main window configuration', () => {
		function readWindowConfig(): { label: string; decorations: boolean } {
			const config = JSON.parse(
				readFileSync(
					fileURLToPath(new URL('../../../../src-tauri/tauri.conf.json', import.meta.url)),
					'utf8'
				)
			) as { app: { windows: { label: string; decorations: boolean }[] } };

			return config.app.windows[0];
		}

		it('should start the main window frameless', () => {
			// The custom title bar strip replaces the native one, so the window must be
			// born without decorations. `setDecorations(false)` at runtime would only
			// do it after the native bar had already flashed on screen.
			expect(readWindowConfig()).toMatchObject({ label: 'main', decorations: false });
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

		it('should resolve every window control without evaluating the native module', async () => {
			// No injected client and no `__TAURI_INTERNALS__`: the lazy resolver returns
			// null, so the new methods must resolve as no-ops instead of pulling
			// `@tauri-apps/api/window` into the Node module graph.
			const shell = new TauriWindowShell();

			await expect(shell.minimize()).resolves.toBeUndefined();
			await expect(shell.toggleMaximize()).resolves.toBeUndefined();
			await expect(shell.close()).resolves.toBeUndefined();
			await expect(shell.isMaximized()).resolves.toBe(false);
			await expect(shell.onMaximizedChange(() => {})).resolves.toBeTypeOf('function');
		});
	});
});
