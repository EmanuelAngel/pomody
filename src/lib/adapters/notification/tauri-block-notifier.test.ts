import { describe, it, expect, vi, afterEach } from 'vitest';
import {
	TauriBlockNotifier,
	type TauriBlockNotificationClientLike,
	type TauriBlockNoticeOptions,
	type TauriTapEventLike
} from './tauri-block-notifier';

function createSpyClient(
	options: {
		permissionGranted?: boolean;
		permissionAnswer?: NotificationPermission;
	} = {}
): {
	client: TauriBlockNotificationClientLike;
	sent: TauriBlockNoticeOptions[];
	emit: (event: TauriTapEventLike) => void;
	permissionCalls: number;
	listenerCalls: number;
} {
	const sent: TauriBlockNoticeOptions[] = [];
	const handlers: ((event: TauriTapEventLike) => void)[] = [];
	let permissionCalls = 0;
	let listenerCalls = 0;

	const client: TauriBlockNotificationClientLike = {
		async isPermissionGranted() {
			return options.permissionGranted ?? true;
		},
		async requestPermission() {
			permissionCalls++;
			return options.permissionAnswer ?? 'granted';
		},
		sendNotification(notice) {
			sent.push(notice);
		},
		async onAction(handler) {
			listenerCalls++;
			handlers.push(handler);

			return {
				unregister() {
					handlers.splice(handlers.indexOf(handler), 1);
				}
			};
		}
	};

	return {
		client,
		sent,
		emit(event) {
			for (const handler of [...handlers]) {
				handler(event);
			}
		},
		get permissionCalls() {
			return permissionCalls;
		},
		get listenerCalls() {
			return listenerCalls;
		}
	};
}

/** Lets the adapter's lazily resolved client settle before the assertion. */
async function flush(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
}

const NOTICE = { title: 'Focus block completed', body: 'Take a short break.' };

describe('TauriBlockNotifier', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('isSupported', () => {
		it('should report support when a native client is injected', () => {
			const { client } = createSpyClient();

			expect(new TauriBlockNotifier(client).isSupported).toBe(true);
		});

		it('should report no support outside a Tauri runtime', () => {
			expect(new TauriBlockNotifier().isSupported).toBe(false);
		});

		it('should report support when the Tauri runtime is present', () => {
			vi.stubGlobal('__TAURI_INTERNALS__', { invoke: () => Promise.resolve(null) });

			expect(new TauriBlockNotifier().isSupported).toBe(true);
		});
	});

	describe('requestPermission', () => {
		it('should ask the OS only when the permission is still missing', async () => {
			const granted = createSpyClient({ permissionGranted: true });
			const missing = createSpyClient({ permissionGranted: false, permissionAnswer: 'granted' });

			await expect(new TauriBlockNotifier(granted.client).requestPermission()).resolves.toBe(true);
			expect(granted.permissionCalls).toBe(0);

			await expect(new TauriBlockNotifier(missing.client).requestPermission()).resolves.toBe(true);
			expect(missing.permissionCalls).toBe(1);
		});

		it('should report a denied permission as false instead of throwing', async () => {
			const { client } = createSpyClient({ permissionGranted: false, permissionAnswer: 'denied' });

			await expect(new TauriBlockNotifier(client).requestPermission()).resolves.toBe(false);
		});

		it('should resolve false on the web, where no client is ever resolved', async () => {
			await expect(new TauriBlockNotifier().requestPermission()).resolves.toBe(false);
		});
	});

	describe('notify', () => {
		it('should send the finished title and the body naming the next phase', async () => {
			const { client, sent } = createSpyClient();

			await new TauriBlockNotifier(client).notify(NOTICE);

			expect(sent).toEqual([NOTICE]);
		});

		it('should ask once and send the notice when a cold start reports a stale denial', async () => {
			const spy = createSpyClient({ permissionGranted: false, permissionAnswer: 'granted' });

			await new TauriBlockNotifier(spy.client).notify(NOTICE);

			expect(spy.sent).toHaveLength(1);
			expect(spy.permissionCalls).toBe(1);
		});

		it('should not turn a genuinely denied permission into a dialog per notice', async () => {
			const spy = createSpyClient({ permissionGranted: false, permissionAnswer: 'denied' });
			const notifier = new TauriBlockNotifier(spy.client);

			await notifier.notify(NOTICE);
			await notifier.notify(NOTICE);

			expect(spy.sent).toEqual([]);
			expect(spy.permissionCalls).toBe(1);
		});

		it('should swallow a failing backend instead of rejecting: a lost notice never breaks a block', async () => {
			const failing: TauriBlockNotificationClientLike = {
				...createSpyClient().client,
				sendNotification() {
					throw new Error('toast backend exploded');
				}
			};

			await expect(new TauriBlockNotifier(failing).notify(NOTICE)).resolves.toBeUndefined();
		});

		it('should resolve the notice on the web, where no client is ever resolved', async () => {
			await expect(new TauriBlockNotifier().notify(NOTICE)).resolves.toBeUndefined();
		});

		it('should never reach the native runtime when a client is injected', async () => {
			const { client, sent } = createSpyClient();
			vi.stubGlobal('__TAURI_INTERNALS__', {
				invoke: () => {
					throw new Error('native runtime must not be reached');
				}
			});

			await new TauriBlockNotifier(client).notify(NOTICE);

			expect(sent).toHaveLength(1);
		});
	});

	describe('tap activation', () => {
		it('should arm the native listener before the notice is shown', async () => {
			const spy = createSpyClient();

			await new TauriBlockNotifier(spy.client).notify(NOTICE);

			expect(spy.listenerCalls).toBe(1);
		});

		it('should arm the listener once, not once per notice', async () => {
			const spy = createSpyClient();
			const notifier = new TauriBlockNotifier(spy.client);

			await notifier.notify(NOTICE);
			await notifier.notify(NOTICE);

			expect(spy.listenerCalls).toBe(1);
		});

		it('should focus the window when the user taps the notice', async () => {
			const spy = createSpyClient();
			const focus = vi.fn(async () => {});

			await new TauriBlockNotifier(spy.client, focus).notify(NOTICE);
			spy.emit({ actionId: 'tap' });
			await flush();

			expect(focus).toHaveBeenCalledTimes(1);
		});

		it('should ignore any action id other than a tap', async () => {
			const spy = createSpyClient();
			const focus = vi.fn(async () => {});
			await new TauriBlockNotifier(spy.client, focus).notify(NOTICE);

			spy.emit({ actionId: 'something_else' });
			await flush();

			expect(focus).not.toHaveBeenCalled();
		});

		it('should swallow a failing focus instead of rejecting inside the listener', async () => {
			const spy = createSpyClient();
			const focus = vi.fn(async () => {
				throw new Error('window is gone');
			});
			await new TauriBlockNotifier(spy.client, focus).notify(NOTICE);

			expect(() => spy.emit({ actionId: 'tap' })).not.toThrow();
			await flush();
		});

		it('should still show the notice when arming the listener fails', async () => {
			const spy = createSpyClient();
			const failing: TauriBlockNotificationClientLike = {
				...spy.client,
				async onAction() {
					throw new Error('no action API on this platform');
				}
			};

			await expect(new TauriBlockNotifier(failing).notify(NOTICE)).resolves.toBeUndefined();
			expect(spy.sent).toHaveLength(1);
		});
	});
});
