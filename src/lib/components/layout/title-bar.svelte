<script lang="ts">
	import { onMount } from 'svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Copy from '@lucide/svelte/icons/copy';
	import Minus from '@lucide/svelte/icons/minus';
	import Square from '@lucide/svelte/icons/square';
	import Timer from '@lucide/svelte/icons/timer';
	import X from '@lucide/svelte/icons/x';
	import {
		windowState as defaultWindowState,
		type WindowState
	} from '$lib/state/windowState.svelte';

	interface Props {
		/**
		 * Injected so the strip stays testable and presentational about *where* the
		 * window state comes from; it owns no native logic of its own.
		 */
		windowState?: WindowState;
	}

	let { windowState = defaultWindowState }: Props = $props();

	/**
	 * The strip is only chrome for a window that can actually be moved and closed.
	 *
	 * - `isSupported` is false on the web build, where the shell is a safe no-op and the
	 *   browser draws its own tab chrome (spec S5: web users see nothing).
	 * - `isMiniPlayer` is the same window resized to 320x48, which has its own layout and
	 *   no room for a caption bar (spec S4).
	 */
	const visible = $derived(windowState.isSupported && !windowState.isMiniPlayer);

	/**
	 * Mirrors the OS, not our own last click: `Win+Up` and drag-to-snap flip the state
	 * without going through this component (spec S3).
	 */
	const isMaximized = $derived(windowState.isMaximized);

	/**
	 * Caption-button names are literal English, not Paraglide messages: `messages/*.json`
	 * is outside this task's edit surface. Registering the three keys is tracked as debt
	 * in `docs/features/custom-window-controls/spec.md`.
	 */
	const minimizeLabel = 'Minimize window';
	const maximizeLabel = $derived(isMaximized ? 'Restore window' : 'Maximize window');
	const closeLabel = 'Close window';

	/**
	 * Shared caption-button treatment: full-height, square, token-based hover only.
	 * The strip itself never reacts to hover, so the window chrome does not flicker.
	 */
	const captionButtonClass = 'h-full w-10 rounded-none text-muted-foreground hover:text-foreground';

	/**
	 * Keeps the glyph honest while the window is untouched by us as well: the current
	 * value is read on subscribe, and later changes arrive through the shell. The
	 * unsubscribe runs on unmount so a destroyed strip cannot write into the state.
	 */
	onMount(() => {
		if (!windowState.isSupported) return;

		let disposed = false;
		let unsubscribe: (() => void) | undefined;

		void windowState.watchMaximizedState().then((detach) => {
			if (disposed) {
				detach();
				return;
			}

			unsubscribe = detach;
		});

		return () => {
			disposed = true;
			unsubscribe?.();
		};
	});

	function handleMinimize() {
		void windowState.minimize();
	}

	function handleToggleMaximize() {
		void windowState.toggleMaximize();
	}

	function handleClose() {
		void windowState.close();
	}

	/**
	 * Windows convention: a double click on the caption bar maximizes or restores.
	 *
	 * The buttons keep their own clicks. `data-tauri-drag-region` is not inherited, so the
	 * native drag never starts on them either — but a double click still bubbles up to this
	 * handler, and without the guard the window would maximize behind the button.
	 */
	function handleDoubleClick(event: MouseEvent) {
		const target = event.target;
		if (!(target instanceof Element) || target.closest('button') !== null) return;

		handleToggleMaximize();
	}
</script>

<!--
	Frameless-window chrome (spec S5). A strip of its own ABOVE the header, never merged
	into it: the header fades during a running block, and this is the only remaining
	surface to drag, maximize or close the window from then on.

	Visually it is the app background — same token, no separate tone, no separator line —
	so the window reads as one piece instead of an app wearing a frame.
-->
{#if visible}
	<div
		data-slot="title-bar"
		data-tauri-drag-region
		role="group"
		aria-label="Window title bar"
		ondblclick={handleDoubleClick}
		class="fixed inset-x-0 top-0 z-40 flex h-8 items-center justify-between bg-background select-none"
	>
		<!-- Left: brand identity. Repeated on the child elements because `data-tauri-drag-region`
		     is opt-in: an attribute on the parent does not make the text draggable. -->
		<div data-tauri-drag-region class="flex items-center gap-2 pl-3">
			<span
				data-slot="title-bar-mark"
				data-tauri-drag-region
				aria-hidden="true"
				class="flex items-center text-muted-foreground/70"
			>
				<Timer class="size-3.5" />
			</span>
			<span
				data-tauri-drag-region
				class="text-[0.6875rem] font-medium tracking-wide text-muted-foreground/70"
			>
				Pomody
			</span>
		</div>

		<!-- Right: window controls. Never a drag region: a drag surface under a button eats its clicks. -->
		<div
			data-slot="title-bar-controls"
			role="group"
			aria-label="Window controls"
			class="flex h-full items-stretch"
		>
			<Button
				variant="ghost"
				size="icon-sm"
				aria-label={minimizeLabel}
				onclick={handleMinimize}
				class="{captionButtonClass} hover:bg-muted/50"
			>
				<Minus class="size-3" />
			</Button>

			<Button
				variant="ghost"
				size="icon-sm"
				aria-label={maximizeLabel}
				data-glyph={isMaximized ? 'restore' : 'maximize'}
				onclick={handleToggleMaximize}
				class="{captionButtonClass} hover:bg-muted/50"
			>
				{#if isMaximized}
					<!-- Two overlapping windows, the Windows "restore" mark. -->
					<Copy class="size-3" />
				{:else}
					<Square class="size-2.5" />
				{/if}
			</Button>

			<!-- Close asks the shell for a native close, which the desktop turns into
			     hide-to-tray (spec S2). It is the only control with a stronger hover. -->
			<Button
				variant="ghost"
				size="icon-sm"
				aria-label={closeLabel}
				onclick={handleClose}
				class="{captionButtonClass} hover:bg-accent-love/20 hover:text-accent-love"
			>
				<X class="size-3" />
			</Button>
		</div>
	</div>
{/if}
