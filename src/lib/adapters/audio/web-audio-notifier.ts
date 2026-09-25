import type { TimerMode } from '../../domain/timer/timer-fsm';
import type { IAudioNotifier } from '../../domain/ports/IAudioNotifier';

export const CHIME_FREQUENCIES = {
	focus: [523.25, 659.25, 783.99], // C5, E5, G5 (uplifting major triad)
	break: [587.33, 440.0] // D5 -> A4 (soothing grounding cadence)
} as const;

export interface WebAudioNotifierOptions {
	/**
	 * Injected AudioContext instance (primarily for unit tests).
	 */
	audioContext?: AudioContext | null;

	/**
	 * Factory to lazily construct an AudioContext instance when needed.
	 */
	audioContextFactory?: () => AudioContext | null;
}

/**
 * Web Audio API implementation of IAudioNotifier.
 * Synthesizes gentle harmonic chimes via native Web Audio oscillators without external audio files.
 * Designed to be SSR-safe, headless-safe, and resilient against browser autoplay restrictions.
 */
export class WebAudioNotifier implements IAudioNotifier {
	private context: AudioContext | null = null;
	private readonly contextFactory: () => AudioContext | null;

	constructor(options?: WebAudioNotifierOptions | AudioContext) {
		if (options && 'destination' in options) {
			this.context = options;
			this.contextFactory = () => options;
		} else if (options) {
			this.context = options.audioContext ?? null;
			this.contextFactory = options.audioContextFactory ?? (() => this.createDefaultContext());
		} else {
			this.contextFactory = () => this.createDefaultContext();
		}
	}

	/**
	 * Returns true if Web Audio API is supported in the current environment.
	 */
	public static isSupported(): boolean {
		if (typeof window === 'undefined') {
			return false;
		}

		return !!(
			window.AudioContext ||
			(window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
		);
	}

	/**
	 * Synthesizes and plays a transition chime appropriate for the completed timer mode.
	 * Focus completion plays an uplifting harmonic chime (C5-E5-G5 arpeggio).
	 * Break completion plays a soothing grounding chime (D5-A4 cadence).
	 */
	public async notifyBlockCompleted(mode: TimerMode): Promise<void> {
		const context = this.getOrCreateContext();
		if (!context || context.state === 'closed') {
			return;
		}

		if (context.state === 'suspended') {
			try {
				await context.resume();
			} catch {
				// Autoplay restriction prevented resuming; attempt synthesis regardless
			}
		}

		try {
			if (mode === 'focus') {
				this.playFocusChime(context);
			} else if (mode === 'shortBreak' || mode === 'longBreak') {
				this.playBreakChime(context);
			}
		} catch {
			// Graceful degradation on synthesis error
		}
	}

	/**
	 * Unlocks or resumes the underlying AudioContext during a user interaction gesture.
	 */
	public async unlock(): Promise<void> {
		const context = this.getOrCreateContext();
		if (!context || context.state === 'closed') {
			return;
		}

		if (context.state === 'suspended') {
			try {
				await context.resume();
			} catch {
				// Ignore autoplay unlock failures
			}
		}
	}

	/**
	 * Closes and releases the underlying AudioContext.
	 */
	public async close(): Promise<void> {
		if (this.context && this.context.state !== 'closed') {
			try {
				await this.context.close();
			} catch {
				// Ignore errors on close
			}
		}
		this.context = null;
	}

	private getOrCreateContext(): AudioContext | null {
		if (!this.context || this.context.state === 'closed') {
			try {
				this.context = this.contextFactory();
			} catch {
				this.context = null;
			}
		}
		return this.context;
	}

	private createDefaultContext(): AudioContext | null {
		if (typeof window === 'undefined') {
			return null;
		}

		const AudioContextClass =
			window.AudioContext ||
			(window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

		if (!AudioContextClass) {
			return null;
		}

		try {
			return new AudioContextClass();
		} catch {
			return null;
		}
	}

	private playFocusChime(context: AudioContext): void {
		const now = context.currentTime;
		// Uplifting C5-E5-G5 chime with staggered attack
		this.playTone(context, CHIME_FREQUENCIES.focus[0], now, 0.8, 0.15);
		this.playTone(context, CHIME_FREQUENCIES.focus[1], now + 0.1, 0.8, 0.15);
		this.playTone(context, CHIME_FREQUENCIES.focus[2], now + 0.2, 1.0, 0.15);
	}

	private playBreakChime(context: AudioContext): void {
		const now = context.currentTime;
		// Soothing grounding D5 -> A4 cadence
		this.playTone(context, CHIME_FREQUENCIES.break[0], now, 0.8, 0.15);
		this.playTone(context, CHIME_FREQUENCIES.break[1], now + 0.18, 1.0, 0.15);
	}

	private playTone(
		context: AudioContext,
		frequency: number,
		startTime: number,
		duration: number,
		peakGain = 0.15
	): void {
		const osc = context.createOscillator();
		const gain = context.createGain();

		osc.type = 'sine';
		osc.frequency.setValueAtTime(frequency, startTime);

		const attackDuration = 0.02;
		const endTime = startTime + duration;

		// Gentle envelope: short linear attack to prevent clicks, exponential decay to near-silence
		gain.gain.setValueAtTime(0.0001, startTime);
		gain.gain.linearRampToValueAtTime(peakGain, startTime + attackDuration);
		gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

		osc.connect(gain);
		gain.connect(context.destination);

		osc.start(startTime);
		osc.stop(endTime);

		osc.onended = () => {
			try {
				osc.disconnect();
				gain.disconnect();
			} catch {
				// Ignore disconnection errors
			}
		};
	}
}
