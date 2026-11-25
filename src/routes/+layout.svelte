<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Header from '$lib/components/layout/header.svelte';
	import TitleBar from '$lib/components/layout/title-bar.svelte';
	import DailyCounter from '$lib/components/layout/daily-counter.svelte';
	import SettingsDialog from '$lib/components/settings/settings-dialog.svelte';
	import MiniPlayer from '$lib/components/timer/mini-player.svelte';
	import BlockNoticeToaster from '$lib/components/notification/block-notice-toaster.svelte';
	import { appBootstrap } from '$lib/state/app-bootstrap.svelte';
	import { navigationState, type SettingsTab } from '$lib/state/navigation.svelte';
	// Importing the recorder is what starts it: it subscribes to the timer on construction. It lives
	// here, above the Mini-Player branch, so blocks finished in compact mode are recorded too.
	import '$lib/state/focus-history.svelte';
	import '$lib/state/activity-log.svelte';
	import { updateState } from '$lib/state/update.svelte';
	import { windowState } from '$lib/state/windowState.svelte';
	import { timerState } from '$lib/state/timer.svelte';
	import { anchorViewToRunningTimer } from '$lib/state/focus-view';

	let { children } = $props();
	let settingsOpen = $state(false);

	/**
	 * The rail opens on the tab the request asked for: the settings button goes to
	 * Intervals and the header's update indicator — which is only a shortcut to the
	 * updater section — lands on Application (spec S5).
	 */
	let settingsTab: SettingsTab = $state('intervals');

	function handleOpenSettings(tab: SettingsTab = 'intervals') {
		settingsTab = tab;
	}

	/**
	 * Views that cannot reach the dialog (the Metrics invitation to set a goal) ask through the
	 * navigation state; the shell owns the dialog, so it opens it here. Each request has its own id,
	 * so asking twice for the same tab reopens it after the user closed it.
	 */
	let handledSettingsRequestId = 0;
	$effect(() => {
		const request = navigationState.settingsRequest;
		if (request !== null && request.id !== handledSettingsRequestId) {
			handledSettingsRequestId = request.id;
			handleOpenSettings(request.tab);
			settingsOpen = true;
		}
	});

	const isMiniPlayer = $derived(windowState.isMiniPlayer);

	/**
	 * Room for the title bar strip (spec S5), desktop only: the web build keeps the browser's
	 * own chrome and must keep the exact layout it always had.
	 *
	 * The strip is 32px of chrome ABOVE the fixed header, and `header.svelte` cannot be edited,
	 * so the shell owns the geometry. Two shapes, because the routed views behave differently:
	 *
	 * - Every view: `[&>header]:top-8` drops the fixed header below the strip band, and
	 *   `[&>main]:pt-24` keeps the page's own 64px top offset plus the strip, so the content
	 *   still clears the header (which now ends at 88px) with the original 8px gap.
	 * - The Timer view is one centred canvas that never scrolls, so it also gets a shell of
	 *   exactly one viewport: `h-screen` + `flex flex-col` + `pt-8` reserve the strip inside the
	 *   viewport, and `[&>main]:flex-1` + `[&>main]:min-h-0` make the routed view take the height
	 *   that is left instead of asserting `min-h-screen` and overflowing by the strip height.
	 *   That pair is the scrollbar fix from the T3 feedback (L8): without it, the shell's padding
	 *   (96px + 32px) plus the rigid canvas (548px: 400 arc + 24 + 68 + 56) summed 26px more than
	 *   the default 800x650 window. With it the canvas overflows into main's OWN padding — 96px
	 *   above, 32px below — so the document stays one viewport tall and nothing is clipped.
	 *
	 * The list-like views keep their normal `min-h-screen` flow on purpose: bounding them would
	 * turn `justify-center` into unreachable overflow above the viewport once their content is
	 * taller than the window, and those views are supposed to scroll. Small windows still scroll
	 * the document either way, because nothing caps the page height.
	 */
	const hasTitleBar = $derived(windowState.isSupported);
	const activeTab = $derived(navigationState.activeTab);

	const shellLayout = $derived.by(() => {
		if (!hasTitleBar) return undefined;

		return activeTab === 'timer'
			? 'flex h-screen flex-col pt-8 [&>header]:top-8 [&>main]:min-h-0 [&>main]:flex-1 [&>main]:pt-24'
			: '[&>header]:top-8 [&>main]:pt-24';
	});

	/**
	 * On the Timer view the canvas now ends ~3px from the window bottom (the strip took that room
	 * from the bottom margin), which left the fixed daily counter on top of the task pill instead
	 * of just under it. One notch up puts it back in the 24px the Timer already leaves between its
	 * controls and the pill. Other views keep their counter exactly where it was.
	 */
	const dailyCounterOffset = $derived(
		hasTitleBar && activeTab === 'timer' ? 'bottom-9' : undefined
	);

	/**
	 * The previous session must be restored before the shell paints: rendering first
	 * would flash an idle 25:00 and then jump to the restored remaining time.
	 */
	onMount(() => {
		void appBootstrap.restore();
		updateState.start();

		return () => updateState.stop();
	});

	/**
	 * Zen Mode hides the header while a block runs, so a running session is only
	 * usable on the Timer view. The rule lives in `focus-view.ts`, where it is
	 * unit-tested; this is only the reactive wiring, because a `$effect` cannot
	 * live at module level.
	 */
	$effect(() => {
		anchorViewToRunningTimer(timerState, navigationState);
	});

	/**
	 * `Escape` is a window-level concern, so it lives here rather than inside
	 * `mini-player.svelte` — that component stays presentational with an
	 * injected `windowState`. The listener must stay at the top level of the
	 * component, so the guard lives in the handler: `restore()` is already a
	 * no-op outside compact mode.
	 */
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			void windowState.restore();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<!--
	Compact mode replaces the whole application shell, not just the routed view:
	a 280x64 window cannot afford a header, a settings drawer or the daily counter.
	Branching here rather than in +page.svelte keeps it a single conditional.
-->
{#if !appBootstrap.isReady}
	<!--
		Restore placeholder: same background, no timer chrome. Rendering the shell here
		would show the idle default and then jump once the snapshot is adopted.
	-->
	<main class="min-h-screen w-full" aria-busy="true"></main>
{:else if isMiniPlayer}
	<MiniPlayer />
{:else}
	<div class={shellLayout}>
		<!--
			Above the header, on purpose (spec S5). During a running block the header fades
			away and this strip is the only surface left to drag, maximize or close the
			window, so it must never live inside the fading container.
		-->
		<TitleBar />

		<Header bind:settingsOpen onSettingsClick={handleOpenSettings} />
		<SettingsDialog bind:open={settingsOpen} initialTab={settingsTab} />

		{@render children()}

		<DailyCounter class={dailyCounterOffset} />

		<!--
			The toast host lives in the main shell and not in the Mini-Player branch: a compact
			window that always stays on top already shows the phase change, and the block-end
			state suppresses its notices there.
		-->
		<BlockNoticeToaster />
	</div>
{/if}
