import { describe, it, expect } from 'vitest';
import { TauriWindowShell, type TauriWindowClientLike } from './tauri-window-shell';
import { WebWindowShell } from './web-window-shell';
import { FakeWindowShell } from '../../../testing/fakes/platform/fake-window-shell';
import {
	MAIN_WINDOW_DIMENSIONS,
	MAIN_WINDOW_MIN_DIMENSIONS
} from '../../domain/ports/window-shell.port';

function spyClient(over: Partial<TauriWindowClientLike> = {}): {
	client: TauriWindowClientLike;
	order: string[];
	state: { resize: undefined | (() => void) };
} {
	const order: string[] = [];
	const state = { resize: undefined as undefined | (() => void) };
	const client: TauriWindowClientLike = {
		setMinSize: async (d) => void order.push(`setMinSize:${d.width}x${d.height}`),
		setSize: async (d) => void order.push(`setSize:${d.width}x${d.height}`),
		setAlwaysOnTop: async (v) => void order.push(`setAlwaysOnTop:${v}`),
		setDecorations: async (v) => void order.push(`setDecorations:${v}`),
		setResizable: async (v) => void order.push(`setResizable:${v}`),
		center: async () => void order.push('center'),
		isAlwaysOnTop: async () => true,
		minimize: async () => void order.push('minimize'),
		toggleMaximize: async () => void order.push('toggleMaximize'),
		close: async () => void order.push('close'),
		isMaximized: async () => true,
		onResized: async (h) => {
			state.resize = h;
			return async () => void order.push('unlisten');
		},
		...over
	};

	return { client, order, state };
}

describe('IWindowShell share (S5)', () => {
	it('exposes the five window-control members on every implementer', () => {
		const implementers = [
			new WebWindowShell(),
			new FakeWindowShell(),
			new TauriWindowShell(spyClient().client)
		];

		for (const shell of implementers) {
			for (const member of [
				'minimize',
				'toggleMaximize',
				'close',
				'isMaximized',
				'onMaximizedChange'
			] as const) {
				expect(typeof shell[member]).toBe('function');
			}
		}
	});

	it('keeps the web adapter inert and never degrades close() to window.close()', async () => {
		const globals = globalThis as { window?: { close: () => void } };
		const previous = globals.window;
		let closeCalls = 0;
		globals.window = { close: () => void closeCalls++ };

		try {
			const shell = new WebWindowShell();

			await shell.close();
			await shell.minimize();
			await shell.toggleMaximize();

			expect(await shell.isMaximized()).toBe(false);
			expect(closeCalls).toBe(0);

			const unsubscribe = await shell.onMaximizedChange(() => {});
			expect(unsubscribe()).toBeUndefined();
		} finally {
			globals.window = previous;
		}
	});
});

describe('S2: close preserves the hide-to-tray path', () => {
	it('issues exactly one native close and nothing else', async () => {
		const { client, order } = spyClient();

		await new TauriWindowShell(client).close();

		// One `close` request is all the frontend may send: Rust turns it into
		// `prevent_close` + `hide`, so any extra window command here (hide, destroy,
		// exit) would either duplicate or bypass the tray behaviour.
		expect(order).toEqual(['close']);
	});
});

describe('S4: restore never brings the native bar back', () => {
	it('runs the documented order with no setDecorations', async () => {
		const { client, order } = spyClient();

		await new TauriWindowShell(client).restoreMainWindow();

		expect(order).toEqual([
			'setAlwaysOnTop:false',
			'setResizable:true',
			`setMinSize:${MAIN_WINDOW_MIN_DIMENSIONS.width}x${MAIN_WINDOW_MIN_DIMENSIONS.height}`,
			`setSize:${MAIN_WINDOW_DIMENSIONS.width}x${MAIN_WINDOW_DIMENSIONS.height}`,
			'center'
		]);
	});
});

describe('S6: maximize observer semantics', () => {
	it('seeds, debounces and unsubscribes', async () => {
		let native = false;
		const { client, order, state } = spyClient({ isMaximized: async () => native });
		const seen: boolean[] = [];
		const unsubscribe = await new TauriWindowShell(client).onMaximizedChange((v) => seen.push(v));

		// Seeded at subscribe time: a resize that changes nothing is not a change.
		await state.resize?.();
		expect(seen).toEqual([]);

		native = true;
		await state.resize?.();
		await state.resize?.();
		expect(seen).toEqual([true]);

		native = false;
		await state.resize?.();
		expect(seen).toEqual([true, false]);

		await unsubscribe();
		expect(order.filter((x) => x === 'unlisten')).toEqual(['unlisten']);
	});

	it('degrades to a no-op unsubscribe when the listener is refused', async () => {
		const { client } = spyClient({
			onResized: async () => {
				throw new Error('denied');
			}
		});

		const unsubscribe = await new TauriWindowShell(client).onMaximizedChange(() => {});

		expect(unsubscribe()).toBeUndefined();
	});
});
