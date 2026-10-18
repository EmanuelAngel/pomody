import { describe, it, expect, vi, afterEach } from 'vitest';
import {
	TauriDistractionNotifier,
	type TauriNotificationClientLike
} from './tauri-distraction-notifier';

interface SentNotice {
	readonly title: string;
	readonly body: string;
}

function createSpyClient(
	options: {
		permissionGranted?: boolean;
		permissionAnswer?: NotificationPermission;
	} = {}
): {
	client: TauriNotificationClientLike;
	sent: SentNotice[];
	permissionCalls: number;
} {
	const sent: SentNotice[] = [];
	let permissionCalls = 0;

	const client: TauriNotificationClientLike = {
		async isPermissionGranted() {
			return options.permissionGranted ?? true;
		},
		async requestPermission() {
			permissionCalls++;
			return options.permissionAnswer ?? 'granted';
		},
		sendNotification(notice) {
			sent.push(notice);
		}
	};

	return {
		client,
		sent,
		get permissionCalls() {
			return permissionCalls;
		}
	};
}

describe('TauriDistractionNotifier', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('isSupported', () => {
		it('should report support when a native client is injected', () => {
			const { client } = createSpyClient();

			expect(new TauriDistractionNotifier(client).isSupported).toBe(true);
		});

		it('should report no support outside a Tauri runtime', () => {
			expect(new TauriDistractionNotifier().isSupported).toBe(false);
		});

		it('should report support when the Tauri runtime is present', () => {
			vi.stubGlobal('__TAURI_INTERNALS__', { invoke: () => Promise.resolve(null) });

			expect(new TauriDistractionNotifier().isSupported).toBe(true);
		});
	});

	describe('requestPermission', () => {
		it('should ask the OS only when the permission is still missing', async () => {
			const granted = createSpyClient({ permissionGranted: true });
			const missing = createSpyClient({ permissionGranted: false, permissionAnswer: 'granted' });

			await expect(new TauriDistractionNotifier(granted.client).requestPermission()).resolves.toBe(
				true
			);
			expect(granted.permissionCalls).toBe(0);

			await expect(new TauriDistractionNotifier(missing.client).requestPermission()).resolves.toBe(
				true
			);
			expect(missing.permissionCalls).toBe(1);
		});

		it('should report a denied permission as false instead of throwing', async () => {
			const { client } = createSpyClient({ permissionGranted: false, permissionAnswer: 'denied' });

			await expect(new TauriDistractionNotifier(client).requestPermission()).resolves.toBe(false);
		});

		it('should resolve false on the web, where no client is ever resolved', async () => {
			await expect(new TauriDistractionNotifier().requestPermission()).resolves.toBe(false);
		});
	});

	describe('notify', () => {
		it('should send the title and the body it was given, untouched', async () => {
			const { client, sent } = createSpyClient();
			const notice = { title: 'Estás en una ventana declarada', body: 'Volviste a YouTube.' };

			await new TauriDistractionNotifier(client).notify(notice);

			expect(sent).toEqual([notice]);
		});

		it('should not send anything when the permission was never granted', async () => {
			const { client, sent } = createSpyClient({ permissionGranted: false });

			await new TauriDistractionNotifier(client).notify({ title: 't', body: 'b' });

			expect(sent).toEqual([]);
		});

		it('should swallow a failing backend instead of rejecting: a lost notice never breaks a block', async () => {
			const failing: TauriNotificationClientLike = {
				async isPermissionGranted() {
					return true;
				},
				async requestPermission() {
					return 'granted';
				},
				sendNotification() {
					throw new Error('toast backend exploded');
				}
			};

			await expect(
				new TauriDistractionNotifier(failing).notify({ title: 't', body: 'b' })
			).resolves.toBeUndefined();
		});

		it('should resolve the notice on the web, where no client is ever resolved', async () => {
			await expect(
				new TauriDistractionNotifier().notify({ title: 't', body: 'b' })
			).resolves.toBeUndefined();
		});

		it('should never reach the native runtime when a client is injected', async () => {
			const { client, sent } = createSpyClient();
			vi.stubGlobal('__TAURI_INTERNALS__', {
				invoke: () => {
					throw new Error('native runtime must not be reached');
				}
			});

			await new TauriDistractionNotifier(client).notify({ title: 't', body: 'b' });

			expect(sent).toEqual([{ title: 't', body: 'b' }]);
		});
	});
});
