import type {
	IDistractionMonitor,
	OpenWindow,
	WindowObservation
} from '$lib/domain/ports/distraction-monitor.port';

/**
 * In-memory test fake implementing IDistractionMonitor.
 *
 * Defaults to `isSupported = true`, because it stands in for the native Windows bridge:
 * a test that needs the Web degradation instantiates it with `{ isSupported: false }`,
 * which is exactly what `NoopDistractionMonitor` reports.
 *
 * `windows` and `foregroundWindow` are public fields so a test can change what the
 * monitor observes between calls without recreating it.
 */
export class FakeDistractionMonitor implements IDistractionMonitor {
	public windows: readonly OpenWindow[];
	public foregroundWindow: WindowObservation | null;
	public foregroundCalls = 0;
	public listCalls = 0;

	private readonly supported: boolean;

	constructor(
		options: {
			isSupported?: boolean;
			windows?: readonly OpenWindow[];
			foregroundWindow?: WindowObservation | null;
		} = {}
	) {
		this.supported = options.isSupported ?? true;
		this.windows = options.windows ?? [];
		this.foregroundWindow = options.foregroundWindow ?? null;
	}

	get isSupported(): boolean {
		return this.supported;
	}

	async getForegroundWindow(): Promise<WindowObservation | null> {
		this.foregroundCalls++;
		return this.foregroundWindow;
	}

	async listOpenWindows(): Promise<readonly OpenWindow[]> {
		this.listCalls++;
		return this.windows;
	}
}
