import { describe, it, expect, vi, afterEach } from 'vitest';
import {
	DISTRACTION_ACTION_TYPE_ID,
	TauriDistractionNotifier,
	type TauriActionEventLike,
	type TauriActionTypeLike,
	type TauriNoticeOptions,
	type TauriNotificationClientLike
} from './tauri-distraction-notifier';

const ACTIONS = [
	{ id: 'ack', title: 'Gracias' },
	{ id: 'silence_day', title: 'Hoy no' },
	{ id: 'silence_permanent', title: 'Nunca' }
] as const;

const RULE_ID = 'rule-chrome';

function createSpyClient(
	options: {
		permissionGranted?: boolean;
		permissionAnswer?: NotificationPermission;
	} = {}
): {
	client: TauriNotificationClientLike;
	sent: TauriNoticeOptions[];
	registered: (readonly TauriActionTypeLike[])[];
	emit: (event: TauriActionEventLike) => void;
	unregisterCalls: number;
	permissionCalls: number;
} {
	const sent: TauriNoticeOptions[] = [];
	const registered: (readonly TauriActionTypeLike[])[] = [];
	const handlers: ((event: TauriActionEventLike) => void)[] = [];
	let permissionCalls = 0;
	let unregisterCalls = 0;

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
		},
		async registerActionTypes(types) {
			registered.push(types);
		},
		async onAction(handler) {
			handlers.push(handler);

			return {
				unregister() {
					unregisterCalls++;
					handlers.splice(handlers.indexOf(handler), 1);
				}
			};
		}
	};

	return {
		client,
		sent,
		registered,
		emit(event) {
			for (const handler of [...handlers]) {
				handler(event);
			}
		},
		get unregisterCalls() {
			return unregisterCalls;
		},
		get permissionCalls() {
			return permissionCalls;
		}
	};
}

/** Lets the adapter's lazily resolved client settle before the assertion. */
async function flush(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
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

	describe('supportsActions', () => {
		it('should report actions on a native runtime, where the buttons exist', () => {
			const { client } = createSpyClient();

			expect(new TauriDistractionNotifier(client).supportsActions).toBe(true);
			expect(new TauriDistractionNotifier().supportsActions).toBe(false);
		});
	});

	describe('registerActions', () => {
		it('should declare the three actions under one type', async () => {
			const { client, registered } = createSpyClient();

			await new TauriDistractionNotifier(client).registerActions(ACTIONS);

			expect(registered).toEqual([
				[
					{
						id: DISTRACTION_ACTION_TYPE_ID,
						actions: [
							{ id: 'ack', title: 'Gracias' },
							{ id: 'silence_day', title: 'Hoy no' },
							{ id: 'silence_permanent', title: 'Nunca' }
						]
					}
				]
			]);
		});

		it('should swallow a failing registration: a faro notice is still a notice', async () => {
			const failing: TauriNotificationClientLike = {
				...createSpyClient().client,
				async registerActionTypes() {
					throw new Error('no action API on this platform');
				}
			};

			await expect(
				new TauriDistractionNotifier(failing).registerActions(ACTIONS)
			).resolves.toBeUndefined();
		});

		it('should resolve on the web, where no client is ever resolved', async () => {
			await expect(
				new TauriDistractionNotifier().registerActions(ACTIONS)
			).resolves.toBeUndefined();
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
		it('should send the notice carrying the action type and the rule it is about', async () => {
			const { client, sent } = createSpyClient();

			await new TauriDistractionNotifier(client).notify({
				title: 'Estás en una ventana declarada',
				body: 'Volviste a YouTube.',
				ruleId: RULE_ID
			});

			expect(sent).toEqual([
				{
					title: 'Estás en una ventana declarada',
					body: 'Volviste a YouTube.',
					actionTypeId: DISTRACTION_ACTION_TYPE_ID,
					extra: { ruleId: RULE_ID }
				}
			]);
		});

		/**
		 * Finding 1 of the independent verification of `6aeab5f`: on Windows the plugin's
		 * injected shim answers "not granted" on a cold start even when the user granted it
		 * in a previous session, so a detector that was already switched on sent nothing at
		 * all. Asking once is what turns that first answer into a working notice.
		 */
		it('should ask once and send the notice when a cold start reports a stale denial', async () => {
			const spy = createSpyClient({ permissionGranted: false, permissionAnswer: 'granted' });
			const notifier = new TauriDistractionNotifier(spy.client);

			await notifier.notify({ title: 't', body: 'b', ruleId: RULE_ID });

			expect(spy.sent).toHaveLength(1);
			expect(spy.permissionCalls).toBe(1);
		});

		it('should not turn a genuinely denied permission into a dialog per notice', async () => {
			const spy = createSpyClient({ permissionGranted: false, permissionAnswer: 'denied' });
			const notifier = new TauriDistractionNotifier(spy.client);

			await notifier.notify({ title: 't', body: 'b', ruleId: RULE_ID });
			await notifier.notify({ title: 't2', body: 'b2', ruleId: RULE_ID });

			expect(spy.sent).toEqual([]);
			expect(spy.permissionCalls).toBe(1);
		});

		it('should swallow a failing backend instead of rejecting: a lost notice never breaks a block', async () => {
			const failing: TauriNotificationClientLike = {
				...createSpyClient().client,
				sendNotification() {
					throw new Error('toast backend exploded');
				}
			};

			await expect(
				new TauriDistractionNotifier(failing).notify({ title: 't', body: 'b', ruleId: RULE_ID })
			).resolves.toBeUndefined();
		});

		it('should resolve the notice on the web, where no client is ever resolved', async () => {
			await expect(
				new TauriDistractionNotifier().notify({ title: 't', body: 'b', ruleId: RULE_ID })
			).resolves.toBeUndefined();
		});

		it('should never reach the native runtime when a client is injected', async () => {
			const { client, sent } = createSpyClient();
			vi.stubGlobal('__TAURI_INTERNALS__', {
				invoke: () => {
					throw new Error('native runtime must not be reached');
				}
			});

			await new TauriDistractionNotifier(client).notify({
				title: 't',
				body: 'b',
				ruleId: RULE_ID
			});

			expect(sent).toHaveLength(1);
		});
	});

	describe('onAction', () => {
		it('should report the picked action together with the rule the notice was about', async () => {
			const { client, emit } = createSpyClient();
			const picked: [string, string][] = [];

			new TauriDistractionNotifier(client).onAction((actionId, ruleId) => {
				picked.push([actionId, ruleId]);
			});
			await flush();

			emit({ actionId: 'silence_day', notification: { extra: { ruleId: RULE_ID } } });

			expect(picked).toEqual([['silence_day', RULE_ID]]);
		});

		it('should drop a tap on the notice itself and any id outside the three actions', async () => {
			const { client, emit } = createSpyClient();
			const picked: string[] = [];

			new TauriDistractionNotifier(client).onAction((actionId) => {
				picked.push(actionId);
			});
			await flush();

			emit({ actionId: 'tap', notification: { extra: { ruleId: RULE_ID } } });
			emit({ actionId: 'something_else', notification: { extra: { ruleId: RULE_ID } } });

			expect(picked).toEqual([]);
		});

		it('should drop an action that arrives without the rule it was about', async () => {
			const { client, emit } = createSpyClient();
			const picked: string[] = [];

			new TauriDistractionNotifier(client).onAction((actionId) => {
				picked.push(actionId);
			});
			await flush();

			emit({ actionId: 'ack', notification: null });
			emit({ actionId: 'ack', notification: { extra: {} } });
			emit({ actionId: 'ack', notification: { extra: { ruleId: '' } } });

			expect(picked).toEqual([]);
		});

		it('should unsubscribe the native listener when the caller unsubscribes', async () => {
			const spy = createSpyClient();
			const notifier = new TauriDistractionNotifier(spy.client);

			const unsubscribe = notifier.onAction(() => {});
			await flush();
			unsubscribe();
			spy.emit({ actionId: 'ack', notification: { extra: { ruleId: RULE_ID } } });

			expect(spy.unregisterCalls).toBe(1);
		});

		it('should subscribe to nothing on the web, where no client is ever resolved', async () => {
			const unsubscribe = new TauriDistractionNotifier().onAction(() => {});

			await flush();

			expect(() => unsubscribe()).not.toThrow();
		});
	});
});
