<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Header from '$lib/components/layout/header.svelte';
	import SettingsDrawer from '$lib/components/settings/settings-drawer.svelte';

	let { children } = $props();
	let settingsOpen = $state(false);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<Header bind:settingsOpen />
<SettingsDrawer bind:open={settingsOpen} />

{@render children()}
