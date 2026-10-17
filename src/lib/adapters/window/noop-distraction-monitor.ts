import type {
	IDistractionMonitor,
	OpenWindow,
	WindowObservation
} from '../../domain/ports/distraction-monitor.port';

/**
 * IDistractionMonitor adapter for the web build (spec §3.1).
 *
 * Browsers cannot read other processes' windows, so the detector does not exist on the
 * web: every read degrades to a safe empty answer, no native call is made, no DOM global
 * is touched and nothing throws. The UI gates on `isSupported` and hides itself instead of
 * rendering a switch that does nothing.
 */
export class NoopDistractionMonitor implements IDistractionMonitor {
	/** The web platform can never read other processes' windows. */
	public readonly isSupported = false;

	public async getForegroundWindow(): Promise<WindowObservation | null> {
		return null;
	}

	public async listOpenWindows(): Promise<readonly OpenWindow[]> {
		return [];
	}
}
