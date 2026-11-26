<script lang="ts">
	import type { Component } from 'svelte';
	import { t } from '$lib/state/locale.svelte';

	interface Props {
		/** Lazy: the charts and their math stay out of the timer's bundle (spec S25). */
		load?: () => Promise<{ default: Component }>;
	}

	let { load = () => import('./metrics-view.svelte') }: Props = $props();
</script>

{#await load() then metricsModule}
	{@const MetricsView = metricsModule.default}
	<MetricsView />
{:catch}
	<p class="py-12 text-center text-xs text-destructive" role="alert">
		{t.metrics_view_load_failed()}
	</p>
{/await}
