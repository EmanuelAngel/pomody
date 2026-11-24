import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import TitleBar from './title-bar.svelte';
import { createWindowState } from '$lib/state/windowState.svelte';
import { WebWindowShell } from '$lib/adapters/window/web-window-shell';
import { FakeWindowShell } from '$tests/fakes/platform/fake-window-shell';

const STRIP = '[data-slot="title-bar"]';
const CONTROLS = '[data-slot="title-bar-controls"]';
const MARK = '[data-slot="title-bar-mark"]';

function createDesktopWindow(options: { maximized?: boolean } = {}) {
	const shell = new FakeWindowShell();
	shell.maximized = options.maximized ?? false;

	return { shell, windowState: createWindowState(shell) };
}

describe('TitleBar visibility gates', () => {
	it('renders nothing on the web build, where the window cannot be manipulated', async () => {
		const windowState = createWindowState(new WebWindowShell());

		const screen = await render(TitleBar, { windowState });

		expect(screen.container.querySelector(STRIP)).toBeNull();
		expect(screen.container.querySelectorAll('button').length).toBe(0);
	});

	it('renders nothing while the Mini-Player owns the window chrome', async () => {
		const { windowState } = createDesktopWindow();
		windowState.isMiniPlayer = true;

		const screen = await render(TitleBar, { windowState });

		expect(screen.container.querySelector(STRIP)).toBeNull();
		expect(screen.container.querySelectorAll('button').length).toBe(0);
	});
});

describe('TitleBar content', () => {
	it('renders the brand mark, the title and the three window controls', async () => {
		const { windowState } = createDesktopWindow();

		const screen = await render(TitleBar, { windowState });

		const strip = screen.container.querySelector(STRIP);
		expect(strip).not.toBeNull();
		expect(strip?.querySelector(MARK)).not.toBeNull();

		await expect.element(screen.getByText('Pomody')).toBeVisible();
		await expect.element(screen.getByRole('group', { name: 'Window controls' })).toBeVisible();
		await expect.element(screen.getByRole('button', { name: 'Minimize window' })).toBeVisible();
		await expect.element(screen.getByRole('button', { name: 'Maximize window' })).toBeVisible();
		await expect.element(screen.getByRole('button', { name: 'Close window' })).toBeVisible();
	});

	it('names every control, because the glyphs alone carry no accessible text', async () => {
		const { windowState } = createDesktopWindow();

		const screen = await render(TitleBar, { windowState });

		await expect
			.element(screen.getByRole('button', { name: 'Minimize window' }))
			.toHaveAttribute('aria-label', 'Minimize window');
		await expect
			.element(screen.getByRole('button', { name: 'Maximize window' }))
			.toHaveAttribute('aria-label', 'Maximize window');
		await expect
			.element(screen.getByRole('button', { name: 'Close window' }))
			.toHaveAttribute('aria-label', 'Close window');
	});
});

describe('TitleBar window controls', () => {
	it('minimizes the window through the injected window state', async () => {
		const { shell, windowState } = createDesktopWindow();

		const screen = await render(TitleBar, { windowState });
		await screen.getByRole('button', { name: 'Minimize window' }).click();

		await expect.poll(() => shell.minimizeCallCount).toBe(1);
	});

	it('toggles maximize and swaps its glyph to restore in the same interaction', async () => {
		const { shell, windowState } = createDesktopWindow();

		const screen = await render(TitleBar, { windowState });
		await screen.getByRole('button', { name: 'Maximize window' }).click();

		await expect.poll(() => shell.toggleMaximizeCallCount).toBe(1);
		await expect.element(screen.getByRole('button', { name: 'Restore window' })).toBeVisible();
		expect(windowState.isMaximized).toBe(true);
	});

	it('closes the window through the close request that the shell turns into tray', async () => {
		const { shell, windowState } = createDesktopWindow();

		const screen = await render(TitleBar, { windowState });
		await screen.getByRole('button', { name: 'Close window' }).click();

		await expect.poll(() => shell.closeCallCount).toBe(1);
	});
});

describe('TitleBar maximized state', () => {
	it('starts as restore when the window is already maximized', async () => {
		const { windowState } = createDesktopWindow({ maximized: true });

		const screen = await render(TitleBar, { windowState });

		await expect.element(screen.getByRole('button', { name: 'Restore window' })).toBeVisible();
		expect(windowState.isMaximized).toBe(true);
	});

	it('follows a maximize the OS performs on its own', async () => {
		const { shell, windowState } = createDesktopWindow();

		const screen = await render(TitleBar, { windowState });
		await expect.element(screen.getByRole('button', { name: 'Maximize window' })).toBeVisible();
		await expect.poll(() => shell.onMaximizedChangeCallCount).toBe(1);

		// `Win+Up` and drag-to-snap never go through the app's own controls.
		shell.emitMaximizedChange(true);

		await expect.element(screen.getByRole('button', { name: 'Restore window' })).toBeVisible();
	});

	it('stops following the native state once unmounted', async () => {
		const { shell, windowState } = createDesktopWindow();

		const screen = await render(TitleBar, { windowState });
		await expect.poll(() => shell.onMaximizedChangeCallCount).toBe(1);

		await screen.unmount();
		await new Promise((resolve) => setTimeout(resolve, 0));
		shell.emitMaximizedChange(true);

		expect(windowState.isMaximized).toBe(false);
	});
});

describe('TitleBar drag region', () => {
	it('marks the strip background as the drag region and keeps the controls out of it', async () => {
		const { windowState } = createDesktopWindow();

		const screen = await render(TitleBar, { windowState });
		const strip = screen.container.querySelector(STRIP) as HTMLElement;
		const controls = strip.querySelector(CONTROLS) as HTMLElement;

		// `data-tauri-drag-region` is opt-in and not inherited: the attribute has to sit
		// on the background element itself.
		expect(strip.hasAttribute('data-tauri-drag-region')).toBe(true);
		expect(controls.hasAttribute('data-tauri-drag-region')).toBe(false);
		expect(controls.querySelectorAll('[data-tauri-drag-region]').length).toBe(0);
	});

	it('toggles maximize on a double click over the background', async () => {
		const { shell, windowState } = createDesktopWindow();

		const screen = await render(TitleBar, { windowState });
		const strip = screen.container.querySelector(STRIP) as HTMLElement;
		await userEvent.dblClick(strip);

		await expect.poll(() => shell.toggleMaximizeCallCount).toBe(1);
		await expect.element(screen.getByRole('button', { name: 'Restore window' })).toBeVisible();
	});

	it('ignores a double click that lands on a control', async () => {
		const { shell, windowState } = createDesktopWindow();

		const screen = await render(TitleBar, { windowState });
		await screen.getByRole('button', { name: 'Minimize window' }).dblClick();

		// The two clicks reach their own button and nothing else.
		await expect.poll(() => shell.minimizeCallCount).toBe(2);
		expect(shell.toggleMaximizeCallCount).toBe(0);
	});
});

describe('TitleBar style', () => {
	it('paints the strip in the app background with no band or separator of its own', async () => {
		const { windowState } = createDesktopWindow();

		const screen = await render(TitleBar, { windowState });
		const strip = screen.container.querySelector(STRIP) as HTMLElement;
		const classes = strip.getAttribute('class') ?? '';

		expect(classes).toContain('h-8');
		expect(classes).toContain('bg-background');
		expect(classes).not.toContain('border-b');
		// The strip never reacts to hover: only its buttons do.
		expect(classes).not.toContain('hover:');
	});

	it('keeps the hover treatment on the buttons, expressed in theme tokens', async () => {
		const { windowState } = createDesktopWindow();

		const screen = await render(TitleBar, { windowState });
		const minimize = screen.getByRole('button', { name: 'Minimize window' }).element();
		const close = screen.getByRole('button', { name: 'Close window' }).element();

		expect(minimize.getAttribute('class')).toContain('hover:text-foreground');
		// Windows convention: close is the only control with a stronger hover, still a token.
		expect(close.getAttribute('class')).toContain('hover:bg-accent-love');
	});
});
