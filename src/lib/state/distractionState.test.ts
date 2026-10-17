import { describe, it, expect, vi, afterEach } from 'vitest';
import { NoopDistractionMonitor } from '$lib/adapters/window/noop-distraction-monitor';
import { TauriDistractionMonitor } from '$lib/adapters/window/tauri-distraction-monitor';
import { createDefaultDistractionMonitor } from './distractionState.svelte';

describe('createDefaultDistractionMonitor', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('should fall back to the no-op monitor outside a Tauri runtime', () => {
		const monitor = createDefaultDistractionMonitor();

		expect(monitor).toBeInstanceOf(NoopDistractionMonitor);
		expect(monitor.isSupported).toBe(false);
	});

	it('should select the Tauri monitor when the Tauri runtime is present', () => {
		vi.stubGlobal('__TAURI_INTERNALS__', { invoke: () => Promise.resolve(null) });

		expect(createDefaultDistractionMonitor()).toBeInstanceOf(TauriDistractionMonitor);
	});
});
