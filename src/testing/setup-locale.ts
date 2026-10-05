import { afterEach } from 'vitest';
import { localeState } from '$lib/state/locale.svelte';

afterEach(() => {
	localeState.setLocale('en');
	try {
		if (typeof localStorage !== 'undefined') {
			localStorage.removeItem('pomody_locale');
		}
	} catch {
		// No-op in environments without storage access
	}
});
