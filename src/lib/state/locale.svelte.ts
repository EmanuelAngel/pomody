import {
	locales,
	setLocale as setParaglideLocale,
	overwriteGetLocale,
	type Locale
} from '$lib/paraglide/runtime';
import * as m from '$lib/paraglide/messages';

export type AvailableLanguageTag = Locale;
export const SUPPORTED_LOCALES: readonly AvailableLanguageTag[] = locales;

export const STORAGE_KEY = 'pomody_locale';

function getStorage(injected?: Storage): Storage | null {
	if (injected !== undefined) return injected;
	try {
		if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
			return window.localStorage;
		}
		if (typeof localStorage !== 'undefined') {
			return localStorage;
		}
	} catch {
		return null;
	}
	return null;
}

function resolveInitialLocale(storage?: Storage): AvailableLanguageTag {
	const s = getStorage(storage);
	if (!s) return 'en';
	try {
		const stored = s.getItem(STORAGE_KEY);
		if (stored === 'en' || stored === 'es') {
			return stored;
		}
	} catch {
		// Ignore environments without storage access or errors
	}
	return 'en';
}

export class LocaleState {
	private readonly storage?: Storage;
	current = $state<AvailableLanguageTag>('en');

	constructor(initialLocale?: AvailableLanguageTag, storage?: Storage) {
		this.storage = storage;
		this.current = initialLocale ?? resolveInitialLocale(storage);
		try {
			void setParaglideLocale(this.current, { reload: false });
		} catch {
			// No-op in environments without window/location
		}
		overwriteGetLocale(() => this.current);
	}

	setLocale(tag: AvailableLanguageTag): void {
		overwriteGetLocale(() => this.current);
		if (tag === this.current) return;
		try {
			void setParaglideLocale(tag, { reload: false });
		} catch {
			// Resilient fallback in environments without DOM/location
		}
		this.current = tag;
		const s = getStorage(this.storage);
		if (s) {
			try {
				s.setItem(STORAGE_KEY, tag);
			} catch {
				// Ignore storage write errors (e.g. private mode or quota)
			}
		}
	}
}

export function createLocaleState(
	initialLocale?: AvailableLanguageTag,
	storage?: Storage
): LocaleState {
	return new LocaleState(initialLocale, storage);
}

export const localeState = new LocaleState();

/**
 * Reactive fine-grained proxy wrapping Paraglide messages.
 * Reading any message through `t` tracks dependency on `localeState.current`.
 */
export const t = new Proxy(m, {
	get(target, prop: keyof typeof m) {
		void localeState.current;
		return target[prop];
	}
});
