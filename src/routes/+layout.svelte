<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Header from '$lib/components/layout/header.svelte';
	import DailyCounter from '$lib/components/layout/daily-counter.svelte';
	import SettingsDialog from '$lib/components/settings/settings-dialog.svelte';
	import MiniPlayer from '$lib/components/timer/mini-player.svelte';
	import BlockNoticeToaster from '$lib/components/notification/block-notice-toaster.svelte';
	import { appBootstrap } from '$lib/state/app-bootstrap.svelte';
	import { updateState } from '$lib/state/update.svelte';
	import { windowState } from '$lib/state/windowState.svelte';

	let { children } = $props();
	let settingsOpen = $state(false);

	/**
	 * The rail opens on the tab the request asked for: the settings button goes to
	 * Intervals and the header's update indicator — which is only a shortcut to the
	 * updater section — lands on Application (spec S5).
	 */
	type SettingsTab = 'intervals' | 'appearance' | 'companion' | 'behavior' | 'application';
	let settingsTab: SettingsTab = $state('intervals');

	function handleOpenSettings(tab: SettingsTab = 'intervals') {
		settingsTab = tab;
	}

	const isMiniPlayer = $derived(windowState.isMiniPlayer);

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
	<Header bind:settingsOpen onSettingsClick={handleOpenSettings} />
	<SettingsDialog bind:open={settingsOpen} initialTab={settingsTab} />

	{@render children()}

	<DailyCounter />

	<!--
		The toast host lives in the main shell and not in the Mini-Player branch: a compact
		window that always stays on top already shows the phase change, and the block-end
		state suppresses its notices there.
	-->
	<BlockNoticeToaster />
{/if}
