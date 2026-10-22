<script lang="ts">
	import { findIllustration } from '$lib/domain/illustration/illustration-catalog';
	import './forest-palette.css';
	import ForestPhase1 from './forest-phase-1.svelte';
	import ForestPhase2 from './forest-phase-2.svelte';
	import ForestPhase3 from './forest-phase-3.svelte';
	import ForestPhase4 from './forest-phase-4.svelte';
	import ForestPhase5 from './forest-phase-5.svelte';

	let { phase = 0, animated = false }: { phase?: number; animated?: boolean } = $props();

	const PHASE_COUNT = findIllustration('forest')?.phaseCount ?? 5;
	const currentPhase = $derived(Math.min(PHASE_COUNT - 1, Math.max(0, Math.floor(phase))));
</script>

<!--
	Forest companion. Each phase is its own pixel-drawn scene (forest-phase-N.svelte) on the 320x180
	art grid, painted with the shared colours of forest-palette.css. Retune the whole forest there.
-->
<svg
	viewBox="0 0 320 180"
	width="100%"
	height="100%"
	preserveAspectRatio="xMidYMax slice"
	class="block size-full"
	class:animated
	data-illustration="forest"
	data-phase={currentPhase}
	shape-rendering="crispEdges"
	aria-hidden="true"
	role="presentation"
>
	{#if currentPhase === 0}
		<ForestPhase1 {animated} />
	{:else if currentPhase === 1}
		<ForestPhase2 {animated} />
	{:else if currentPhase === 2}
		<ForestPhase3 {animated} />
	{:else if currentPhase === 3}
		<ForestPhase4 {animated} />
	{:else}
		<ForestPhase5 {animated} />
	{/if}
</svg>
