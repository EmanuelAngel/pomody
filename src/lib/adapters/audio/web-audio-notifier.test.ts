import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebAudioNotifier, CHIME_FREQUENCIES } from './web-audio-notifier';

interface MockOscillator {
	type: string;
	frequency: {
		value: number;
		setValueAtTime: ReturnType<typeof vi.fn>;
	};
	connect: ReturnType<typeof vi.fn>;
	disconnect: ReturnType<typeof vi.fn>;
	start: ReturnType<typeof vi.fn>;
	stop: ReturnType<typeof vi.fn>;
	onended: null | (() => void);
}

interface MockGain {
	gain: {
		value: number;
		setValueAtTime: ReturnType<typeof vi.fn>;
		linearRampToValueAtTime: ReturnType<typeof vi.fn>;
		exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
	};
	connect: ReturnType<typeof vi.fn>;
	disconnect: ReturnType<typeof vi.fn>;
}

function createMockAudioContext(initialState: AudioContextState = 'running') {
	const createdOscillators: MockOscillator[] = [];
	const createdGains: MockGain[] = [];
	let currentState: AudioContextState = initialState;

	const mockContext = {
		get state(): AudioContextState {
			return currentState;
		},
		currentTime: 5.0,
		destination: { id: 'destination-node' },
		resume: vi.fn().mockImplementation(async () => {
			currentState = 'running';
		}),
		close: vi.fn().mockImplementation(async () => {
			currentState = 'closed';
		}),
		createOscillator: vi.fn().mockImplementation(() => {
			const osc: MockOscillator = {
				type: 'sine',
				frequency: {
					value: 0,
					setValueAtTime: vi.fn((val: number) => {
						osc.frequency.value = val;
					})
				},
				connect: vi.fn(),
				disconnect: vi.fn(),
				start: vi.fn(),
				stop: vi.fn(),
				onended: null
			};
			createdOscillators.push(osc);
			return osc;
		}),
		createGain: vi.fn().mockImplementation(() => {
			const gain: MockGain = {
				gain: {
					value: 1,
					setValueAtTime: vi.fn(),
					linearRampToValueAtTime: vi.fn(),
					exponentialRampToValueAtTime: vi.fn()
				},
				connect: vi.fn(),
				disconnect: vi.fn()
			};
			createdGains.push(gain);
			return gain;
		})
	} as unknown as AudioContext;

	return {
		mockContext,
		createdOscillators,
		createdGains
	};
}

describe('WebAudioNotifier', () => {
	let mockCtx: AudioContext;
	let oscillators: MockOscillator[];
	let gains: MockGain[];

	beforeEach(() => {
		const setup = createMockAudioContext('running');
		mockCtx = setup.mockContext;
		oscillators = setup.createdOscillators;
		gains = setup.createdGains;
	});

	describe('Tone Synthesis', () => {
		it('synthesizes uplifting major triad chime when focus block completes', async () => {
			const notifier = new WebAudioNotifier({ audioContext: mockCtx });

			await notifier.notifyBlockCompleted('focus');

			expect(oscillators).toHaveLength(3);
			expect(gains).toHaveLength(3);

			// Verify frequencies match C5, E5, G5
			expect(oscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(
				CHIME_FREQUENCIES.focus[0],
				5.0
			);
			expect(oscillators[1].frequency.setValueAtTime).toHaveBeenCalledWith(
				CHIME_FREQUENCIES.focus[1],
				5.1
			);
			expect(oscillators[2].frequency.setValueAtTime).toHaveBeenCalledWith(
				CHIME_FREQUENCIES.focus[2],
				5.2
			);

			// Verify all oscillators use gentle sine wave
			for (const osc of oscillators) {
				expect(osc.type).toBe('sine');
				expect(osc.start).toHaveBeenCalled();
				expect(osc.stop).toHaveBeenCalled();
			}

			// Verify wiring: osc -> gain -> destination
			for (let i = 0; i < 3; i++) {
				expect(oscillators[i].connect).toHaveBeenCalledWith(gains[i]);
				expect(gains[i].connect).toHaveBeenCalledWith(mockCtx.destination);
			}

			// Verify gain envelope: gentle peak gain (<= 0.2) and exponential decay
			for (const g of gains) {
				expect(g.gain.setValueAtTime).toHaveBeenCalledWith(0.0001, expect.any(Number));
				expect(g.gain.linearRampToValueAtTime).toHaveBeenCalled();
				const [peakGain] = g.gain.linearRampToValueAtTime.mock.calls[0];
				expect(peakGain).toBeLessThanOrEqual(0.2);
				expect(g.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(
					0.0001,
					expect.any(Number)
				);
			}
		});

		it('synthesizes soothing grounding chime when shortBreak block completes', async () => {
			const notifier = new WebAudioNotifier({ audioContext: mockCtx });

			await notifier.notifyBlockCompleted('shortBreak');

			expect(oscillators).toHaveLength(2);
			expect(gains).toHaveLength(2);

			expect(oscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(
				CHIME_FREQUENCIES.break[0],
				5.0
			);
			expect(oscillators[1].frequency.setValueAtTime).toHaveBeenCalledWith(
				CHIME_FREQUENCIES.break[1],
				5.18
			);

			for (const osc of oscillators) {
				expect(osc.type).toBe('sine');
				expect(osc.start).toHaveBeenCalled();
				expect(osc.stop).toHaveBeenCalled();
			}
		});

		it('synthesizes soothing grounding chime when longBreak block completes', async () => {
			const notifier = new WebAudioNotifier({ audioContext: mockCtx });

			await notifier.notifyBlockCompleted('longBreak');

			expect(oscillators).toHaveLength(2);
			expect(gains).toHaveLength(2);

			expect(oscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(
				CHIME_FREQUENCIES.break[0],
				5.0
			);
			expect(oscillators[1].frequency.setValueAtTime).toHaveBeenCalledWith(
				CHIME_FREQUENCIES.break[1],
				5.18
			);
		});

		it('disconnects oscillator and gain when onended event fires', async () => {
			const notifier = new WebAudioNotifier({ audioContext: mockCtx });

			await notifier.notifyBlockCompleted('shortBreak');

			const osc = oscillators[0];
			const gain = gains[0];

			expect(typeof osc.onended).toBe('function');
			osc.onended?.();

			expect(osc.disconnect).toHaveBeenCalled();
			expect(gain.disconnect).toHaveBeenCalled();
		});

		it('gracefully handles disconnection error in onended', async () => {
			const notifier = new WebAudioNotifier({ audioContext: mockCtx });

			await notifier.notifyBlockCompleted('shortBreak');

			const osc = oscillators[0];
			osc.disconnect.mockImplementation(() => {
				throw new Error('Already disconnected');
			});

			expect(() => osc.onended?.()).not.toThrow();
		});
	});

	describe('Autoplay & Unlock', () => {
		it('resumes suspended context when unlock is called', async () => {
			const setup = createMockAudioContext('suspended');
			const notifier = new WebAudioNotifier({ audioContext: setup.mockContext });

			await notifier.unlock();

			expect(setup.mockContext.resume).toHaveBeenCalledOnce();
			expect(setup.mockContext.state).toBe('running');
		});

		it('does not resume context if already running', async () => {
			const setup = createMockAudioContext('running');
			const notifier = new WebAudioNotifier({ audioContext: setup.mockContext });

			await notifier.unlock();

			expect(setup.mockContext.resume).not.toHaveBeenCalled();
		});

		it('attempts to resume suspended context before playing chime', async () => {
			const setup = createMockAudioContext('suspended');
			const notifier = new WebAudioNotifier({ audioContext: setup.mockContext });

			await notifier.notifyBlockCompleted('focus');

			expect(setup.mockContext.resume).toHaveBeenCalledOnce();
			expect(setup.createdOscillators).toHaveLength(3);
		});

		it('does not throw if resume rejects due to autoplay restriction', async () => {
			const setup = createMockAudioContext('suspended');
			vi.mocked(setup.mockContext.resume).mockRejectedValueOnce(
				new Error('NotAllowedError: user gesture required')
			);

			const notifier = new WebAudioNotifier({ audioContext: setup.mockContext });

			await expect(notifier.unlock()).resolves.toBeUndefined();
			await expect(notifier.notifyBlockCompleted('focus')).resolves.toBeUndefined();
		});
	});

	describe('Constructor Injection & Factory', () => {
		it('accepts raw AudioContext instance directly in constructor', async () => {
			const notifier = new WebAudioNotifier(mockCtx);

			await notifier.notifyBlockCompleted('focus');

			expect(oscillators).toHaveLength(3);
		});

		it('lazily instantiates context from audioContextFactory', async () => {
			const factory = vi.fn().mockReturnValue(mockCtx);
			const notifier = new WebAudioNotifier({ audioContextFactory: factory });

			expect(factory).not.toHaveBeenCalled();

			await notifier.notifyBlockCompleted('focus');

			expect(factory).toHaveBeenCalledOnce();
			expect(oscillators).toHaveLength(3);
		});

		it('handles audioContextFactory throwing an error gracefully', async () => {
			const factory = vi.fn().mockImplementation(() => {
				throw new Error('WebAudio not supported');
			});
			const notifier = new WebAudioNotifier({ audioContextFactory: factory });

			await expect(notifier.notifyBlockCompleted('focus')).resolves.toBeUndefined();
			await expect(notifier.unlock()).resolves.toBeUndefined();
		});
	});

	describe('SSR & Headless Safety', () => {
		it('safely handles missing AudioContext (returns without error)', async () => {
			const notifier = new WebAudioNotifier({
				audioContext: null,
				audioContextFactory: () => null
			});

			await expect(notifier.notifyBlockCompleted('focus')).resolves.toBeUndefined();
			await expect(notifier.unlock()).resolves.toBeUndefined();
			await expect(notifier.close()).resolves.toBeUndefined();
		});

		it('does not crash when context is closed', async () => {
			const setup = createMockAudioContext('closed');
			const notifier = new WebAudioNotifier({ audioContext: setup.mockContext });

			await expect(notifier.notifyBlockCompleted('focus')).resolves.toBeUndefined();
			await expect(notifier.unlock()).resolves.toBeUndefined();
			expect(setup.createdOscillators).toHaveLength(0);
		});

		it('closes context and releases reference on close()', async () => {
			const notifier = new WebAudioNotifier({ audioContext: mockCtx });

			await notifier.close();

			expect(mockCtx.close).toHaveBeenCalledOnce();

			// Subsequent calls should be safe no-ops
			await expect(notifier.close()).resolves.toBeUndefined();
		});

		it('correctly reports WebAudio support status', () => {
			// In Node environment, window is undefined
			expect(WebAudioNotifier.isSupported()).toBe(false);
		});
	});
});
