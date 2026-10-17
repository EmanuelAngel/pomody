import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { isTauriRuntimeAvailable } from './tauri-window-shell';
import { TauriDistractionMonitor, type TauriInvokeClientLike } from './tauri-distraction-monitor';

const ACTIVE_WINDOW_COMMAND = 'active_window';
const OPEN_WINDOWS_COMMAND = 'open_windows';

interface InvokeCall {
	readonly command: string;
}

function createSpyClient(answers: Record<string, unknown> = {}): {
	client: TauriInvokeClientLike;
	calls: InvokeCall[];
} {
	const calls: InvokeCall[] = [];

	const client: TauriInvokeClientLike = {
		async invoke(command) {
			calls.push({ command });
			return answers[command];
		}
	};

	return { client, calls };
}

describe('TauriDistractionMonitor', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('isSupported', () => {
		it('should report support when a native client is injected', () => {
			const { client } = createSpyClient();

			expect(new TauriDistractionMonitor(client).isSupported).toBe(true);
		});

		it('should report no support outside a Tauri runtime', () => {
			expect(new TauriDistractionMonitor().isSupported).toBe(false);
		});

		it('should report support when the Tauri runtime is present', () => {
			vi.stubGlobal('__TAURI_INTERNALS__', { invoke: () => Promise.resolve(null) });

			expect(new TauriDistractionMonitor().isSupported).toBe(true);
		});
	});

	describe('getForegroundWindow', () => {
		it('should invoke active_window and normalize the executable path', async () => {
			const { client, calls } = createSpyClient({
				[ACTIVE_WINDOW_COMMAND]: {
					exe: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
					title: 'Docs — Chromium',
					idleSeconds: 12
				}
			});

			const observation = await new TauriDistractionMonitor(client).getForegroundWindow();

			expect(calls.map((call) => call.command)).toEqual([ACTIVE_WINDOW_COMMAND]);
			expect(observation).toEqual({ exe: 'chrome', title: 'Docs — Chromium', idleSeconds: 12 });
		});

		it('should answer null when the command answers null', async () => {
			const { client } = createSpyClient({ [ACTIVE_WINDOW_COMMAND]: null });

			await expect(new TauriDistractionMonitor(client).getForegroundWindow()).resolves.toBeNull();
		});

		it('should answer null when the payload is not a window observation', async () => {
			const { client } = createSpyClient({
				[ACTIVE_WINDOW_COMMAND]: { exe: 'chrome', title: 42, idleSeconds: 1 }
			});

			await expect(new TauriDistractionMonitor(client).getForegroundWindow()).resolves.toBeNull();
		});

		it('should answer null when the executable normalizes to an empty key', async () => {
			const { client } = createSpyClient({
				[ACTIVE_WINDOW_COMMAND]: { exe: 'C:\\', title: 'Untitled shell', idleSeconds: 0 }
			});

			await expect(new TauriDistractionMonitor(client).getForegroundWindow()).resolves.toBeNull();
		});

		it('should answer null when the title is blank', async () => {
			const { client } = createSpyClient({
				[ACTIVE_WINDOW_COMMAND]: { exe: 'chrome.exe', title: '   ', idleSeconds: 0 }
			});

			await expect(new TauriDistractionMonitor(client).getForegroundWindow()).resolves.toBeNull();
		});

		it('should answer null when idleSeconds is not a non-negative finite number', async () => {
			const { client } = createSpyClient({
				[ACTIVE_WINDOW_COMMAND]: { exe: 'chrome.exe', title: 'Docs', idleSeconds: Number.NaN }
			});

			await expect(new TauriDistractionMonitor(client).getForegroundWindow()).resolves.toBeNull();
		});

		it('should resolve null without reaching the Tauri runtime when no client is injected', async () => {
			vi.stubGlobal('__TAURI_INTERNALS__', {
				invoke: () => {
					throw new Error('the native runtime must not be reached');
				}
			});

			await expect(new TauriDistractionMonitor(null).getForegroundWindow()).resolves.toBeNull();
		});
	});

	describe('listOpenWindows', () => {
		it('should invoke open_windows and map every entry to executable and title', async () => {
			const { client, calls } = createSpyClient({
				[OPEN_WINDOWS_COMMAND]: [
					{
						exe: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
						title: 'Docs',
						idleSeconds: 12
					},
					{ exe: 'C:\\Program Files (x86)\\Steam\\steam.exe', title: 'Steam', idleSeconds: 12 }
				]
			});

			const windows = await new TauriDistractionMonitor(client).listOpenWindows();

			expect(calls.map((call) => call.command)).toEqual([OPEN_WINDOWS_COMMAND]);
			expect(windows).toEqual([
				{ exe: 'chrome', title: 'Docs' },
				{ exe: 'steam', title: 'Steam' }
			]);
			expect(windows[0]).not.toHaveProperty('idleSeconds');
		});

		it('should drop unreadable entries and keep the enumeration', async () => {
			const { client } = createSpyClient({
				[OPEN_WINDOWS_COMMAND]: [
					{ exe: 'chrome.exe', title: 'Docs', idleSeconds: 12 },
					{ exe: '', title: 'Elevated process', idleSeconds: 12 },
					{ exe: 42, title: 'Corrupt entry', idleSeconds: 12 },
					{ exe: 'steam.exe', title: '  ', idleSeconds: 12 },
					{ exe: 'Code.exe', title: 'pomody — Visual Studio Code', idleSeconds: 12 }
				]
			});

			await expect(new TauriDistractionMonitor(client).listOpenWindows()).resolves.toEqual([
				{ exe: 'chrome', title: 'Docs' },
				{ exe: 'code', title: 'pomody — Visual Studio Code' }
			]);
		});

		it('should answer an empty list when the command answers a non-array', async () => {
			const { client } = createSpyClient({ [OPEN_WINDOWS_COMMAND]: { exe: 'chrome' } });

			await expect(new TauriDistractionMonitor(client).listOpenWindows()).resolves.toEqual([]);
		});

		it('should resolve an empty list without reaching the Tauri runtime when no client is injected', async () => {
			vi.stubGlobal('__TAURI_INTERNALS__', {
				invoke: () => {
					throw new Error('the native runtime must not be reached');
				}
			});

			await expect(new TauriDistractionMonitor(null).listOpenWindows()).resolves.toEqual([]);
		});
	});

	describe('Tauri command registration', () => {
		it('should invoke only commands registered in the Tauri invoke_handler', () => {
			const lib = readFileSync(
				fileURLToPath(new URL('../../../../src-tauri/src/lib.rs', import.meta.url)),
				'utf8'
			);
			const handler = /generate_handler!\[([\s\S]*?)\]/.exec(lib);

			expect(isTauriRuntimeAvailable()).toBe(false);
			expect(handler?.[1]).toBeDefined();

			for (const command of [ACTIVE_WINDOW_COMMAND, OPEN_WINDOWS_COMMAND]) {
				expect(handler?.[1]).toContain(command);
			}
		});
	});
});
