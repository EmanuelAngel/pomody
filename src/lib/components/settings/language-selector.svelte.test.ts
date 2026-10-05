import { describe, it, expect, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import LanguageSelector from './language-selector.svelte';
import { createLocaleState, localeState } from '$lib/state/locale.svelte';

describe('LanguageSelector (Client Browser)', () => {
	beforeEach(() => {
		// Reset global localeState to 'en' before each test
		localeState.setLocale('en');
	});

	it('renders with English active by default with correct data-state attributes', async () => {
		const state = createLocaleState('en');
		const screen = await render(LanguageSelector, { localeState: state });

		const enToggle = screen.getByRole('radio', { name: 'English language' });
		const esToggle = screen.getByRole('radio', { name: 'Spanish language' });

		await expect.element(enToggle).toBeVisible();
		await expect.element(esToggle).toBeVisible();

		await expect.element(enToggle).toHaveAttribute('data-state', 'on');
		await expect.element(enToggle).toHaveAttribute('aria-checked', 'true');

		await expect.element(esToggle).toHaveAttribute('data-state', 'off');
		await expect.element(esToggle).toHaveAttribute('aria-checked', 'false');

		// Verify visible labels
		await expect.element(screen.getByText('English')).toBeVisible();
		await expect.element(screen.getByText('Español')).toBeVisible();
	});

	it('provides accessible headings, description, and group aria-labels', async () => {
		const state = createLocaleState('en');
		const screen = await render(LanguageSelector, { localeState: state });

		const heading = screen.getByRole('heading', { level: 3, name: 'Language' });
		await expect.element(heading).toBeVisible();

		const description = screen.getByText('Choose application language.');
		await expect.element(description).toBeVisible();

		const group = screen.getByRole('group', { name: 'Language' });
		await expect.element(group).toBeVisible();
	});

	it('interactively switches locale to Spanish when clicking Español', async () => {
		const state = createLocaleState('en');
		const screen = await render(LanguageSelector, { localeState: state });

		const esToggle = screen.getByRole('radio', { name: 'Spanish language' });
		await esToggle.click();

		expect(state.current).toBe('es');

		// Toggle state switches
		const enToggleAfter = screen.getByRole('radio', { name: 'Idioma inglés' });
		const esToggleAfter = screen.getByRole('radio', { name: 'Idioma español' });

		await expect.element(esToggleAfter).toHaveAttribute('data-state', 'on');
		await expect.element(esToggleAfter).toHaveAttribute('aria-checked', 'true');

		await expect.element(enToggleAfter).toHaveAttribute('data-state', 'off');
		await expect.element(enToggleAfter).toHaveAttribute('aria-checked', 'false');

		// Reactively updates section heading and description to Spanish
		await expect.element(screen.getByRole('heading', { level: 3, name: 'Idioma' })).toBeVisible();
		await expect.element(screen.getByText('Elige el idioma de la aplicación.')).toBeVisible();
	});

	it('interactively switches back to English when clicking English', async () => {
		const state = createLocaleState('es');
		const screen = await render(LanguageSelector, { localeState: state });

		// Initial Spanish state
		await expect.element(screen.getByRole('heading', { level: 3, name: 'Idioma' })).toBeVisible();
		const esToggle = screen.getByRole('radio', { name: 'Idioma español' });
		await expect.element(esToggle).toHaveAttribute('data-state', 'on');

		// Switch back to English
		const enToggle = screen.getByRole('radio', { name: 'Idioma inglés' });
		await enToggle.click();

		expect(state.current).toBe('en');

		const enToggleAfter = screen.getByRole('radio', { name: 'English language' });
		const esToggleAfter = screen.getByRole('radio', { name: 'Spanish language' });

		await expect.element(enToggleAfter).toHaveAttribute('data-state', 'on');
		await expect.element(enToggleAfter).toHaveAttribute('aria-checked', 'true');

		await expect.element(esToggleAfter).toHaveAttribute('data-state', 'off');
		await expect.element(esToggleAfter).toHaveAttribute('aria-checked', 'false');

		// Headings and description restored to English
		await expect.element(screen.getByRole('heading', { level: 3, name: 'Language' })).toBeVisible();
		await expect.element(screen.getByText('Choose application language.')).toBeVisible();
	});

	it('uses defaultLocaleState when no prop is provided', async () => {
		localeState.setLocale('en');
		const screen = await render(LanguageSelector);

		const enToggle = screen.getByRole('radio', { name: 'English language' });
		await expect.element(enToggle).toHaveAttribute('data-state', 'on');

		const esToggle = screen.getByRole('radio', { name: 'Spanish language' });
		await esToggle.click();

		expect(localeState.current).toBe('es');
		const esToggleAfter = screen.getByRole('radio', { name: 'Idioma español' });
		await expect.element(esToggleAfter).toHaveAttribute('data-state', 'on');
	});
});
