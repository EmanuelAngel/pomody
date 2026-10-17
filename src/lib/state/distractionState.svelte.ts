import { NoopDistractionMonitor } from '../adapters/window/noop-distraction-monitor';
import { TauriDistractionMonitor } from '../adapters/window/tauri-distraction-monitor';
import { isTauriRuntimeAvailable } from '../adapters/window/tauri-window-shell';
import type { IDistractionMonitor } from '../domain/ports/distraction-monitor.port';

/**
 * Selects the monitor matching the current runtime: the native Windows bridge on
 * desktop, the safe no-op on the web (spec §3.1), mirroring `createDefaultWindowShell`.
 *
 * This module is the composition root of the detector. Slice 5.5 grows it into
 * `distractionState` — the poll loop, the evaluation against the rules and the settings
 * switch — and this selector is the seam that slice consumes.
 */
export function createDefaultDistractionMonitor(): IDistractionMonitor {
	return isTauriRuntimeAvailable() ? new TauriDistractionMonitor() : new NoopDistractionMonitor();
}
