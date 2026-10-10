<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Header from '$lib/components/layout/header.svelte';
	import DailyCounter from '$lib/components/layout/daily-counter.svelte';
	import SettingsDrawer from '$lib/components/settings/settings-drawer.svelte';
	import MiniPlayer from '$lib/components/timer/mini-player.svelte';
	import { windowState } from '$lib/state/windowState.svelte';

	let { children } = $props();
	let settingsOpen = $state(false);

	const isMiniPlayer = $derived(windowState.isMiniPlayer);

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
{#if isMiniPlayer}
	<MiniPlayer />
{:else}
	<Header bind:settingsOpen />
	<SettingsDrawer bind:open={settingsOpen} />

	{@render children()}

	<DailyCounter />
{/if}
