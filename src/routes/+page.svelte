<script lang="ts">
	import Timer from '$lib/components/timer/timer.svelte';
</script>

<svelte:head>
	<title>Pomody — Minimalist Focus Timer</title>
</svelte:head>

<main class="flex min-h-screen w-full flex-col items-center justify-center p-4 sm:p-8">
	<h1 class="sr-only">Pomody — Focus Timer</h1>
	<Timer />
</main>
