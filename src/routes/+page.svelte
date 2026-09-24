<script lang="ts">
	import Timer from '$lib/components/timer/timer.svelte';
	import SettingsTrigger from '$lib/components/settings/settings-trigger.svelte';
	import SettingsDrawer from '$lib/components/settings/settings-drawer.svelte';

	let settingsOpen = $state(false);
</script>

<svelte:head>
	<title>Pomody — Minimalist Focus Timer</title>
</svelte:head>

<SettingsTrigger bind:open={settingsOpen} />
<SettingsDrawer bind:open={settingsOpen} />

<main class="flex min-h-screen w-full flex-col items-center justify-center p-4 sm:p-8">
	<h1 class="sr-only">Pomody — Focus Timer</h1>
	<Timer />
</main>
