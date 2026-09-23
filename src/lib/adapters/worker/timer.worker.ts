// Dedicated Web Worker for background ticking decoupled from main-thread throttling
let intervalId: ReturnType<typeof setInterval> | null = null;
let lastTimestamp = 0;

export interface WorkerStartMessage {
	action: 'start';
	intervalMs?: number;
}

export interface WorkerStopMessage {
	action: 'stop';
}

export type WorkerInboundMessage = WorkerStartMessage | WorkerStopMessage;

export interface WorkerTickOutboundMessage {
	type: 'tick';
	deltaMs: number;
}

self.onmessage = (event: MessageEvent<WorkerInboundMessage>) => {
	const data = event.data;
	if (!data || typeof data !== 'object') return;

	if (data.action === 'start') {
		if (intervalId !== null) {
			clearInterval(intervalId);
		}
		lastTimestamp = Date.now();
		const interval = data.intervalMs && data.intervalMs > 0 ? data.intervalMs : 250;
		intervalId = setInterval(() => {
			const now = Date.now();
			const deltaMs = now - lastTimestamp;
			lastTimestamp = now;
			self.postMessage({ type: 'tick', deltaMs } satisfies WorkerTickOutboundMessage);
		}, interval);
	} else if (data.action === 'stop') {
		if (intervalId !== null) {
			clearInterval(intervalId);
			intervalId = null;
		}
	}
};
