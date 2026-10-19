<script lang="ts">
	import { findIllustration } from '$lib/domain/illustration/illustration-catalog';

	let { phase = 0, animated = false }: { phase?: number; animated?: boolean } = $props();

	const PHASE_COUNT = findIllustration('desert')?.phaseCount ?? 3;
	const currentPhase = $derived(Math.min(PHASE_COUNT - 1, Math.max(0, Math.floor(phase))));
</script>

<!--
	Composition: cacti live on the sides (x < 100 or x > 220) so the centre
	stays clear for the timer. Day, sunset and night follow progress, not the clock.
-->
<svg
	viewBox="0 0 320 180"
	width="100%"
	height="100%"
	preserveAspectRatio="xMidYMax slice"
	class="block h-full w-full"
	class:animated
	data-illustration="desert"
	data-phase={currentPhase}
	shape-rendering="crispEdges"
	aria-hidden="true"
	role="presentation"
>
	{#if currentPhase === 0}
		<!-- Stepped pixel sun, high -->
		<rect x="260" y="20" width="12" height="4" class="fill-accent-gold" opacity="0.95" />
		<rect x="256" y="24" width="20" height="4" class="fill-accent-gold" opacity="0.95" />
		<rect x="252" y="28" width="28" height="16" class="fill-accent-gold" opacity="0.95" />
		<rect x="256" y="44" width="20" height="4" class="fill-accent-gold" opacity="0.95" />
		<rect x="260" y="48" width="12" height="4" class="fill-accent-gold" opacity="0.95" />
	{:else if currentPhase === 1}
		<!-- Same sun, low on the horizon -->
		<rect x="260" y="68" width="12" height="4" class="fill-accent-gold" opacity="0.95" />
		<rect x="256" y="72" width="20" height="4" class="fill-accent-gold" opacity="0.95" />
		<rect x="252" y="76" width="28" height="16" class="fill-accent-gold" opacity="0.95" />
		<rect x="256" y="92" width="20" height="4" class="fill-accent-gold" opacity="0.95" />
		<rect x="260" y="96" width="12" height="4" class="fill-accent-gold" opacity="0.95" />
	{:else}
		<!-- Crescent moon carved out of the theme background -->
		<rect x="260" y="20" width="12" height="4" class="fill-accent-gold" opacity="0.9" />
		<rect x="256" y="24" width="20" height="4" class="fill-accent-gold" opacity="0.9" />
		<rect x="252" y="28" width="28" height="16" class="fill-accent-gold" opacity="0.9" />
		<rect x="256" y="44" width="20" height="4" class="fill-accent-gold" opacity="0.9" />
		<rect x="260" y="48" width="12" height="4" class="fill-accent-gold" opacity="0.9" />
		<rect x="268" y="24" width="12" height="4" class="fill-bg-base" />
		<rect x="268" y="28" width="16" height="16" class="fill-bg-base" />
		<rect x="268" y="44" width="12" height="4" class="fill-bg-base" />
		<rect x="40" y="28" width="4" height="4" class="fill-accent-gold" opacity="0.75" />
		<rect x="76" y="48" width="4" height="4" class="fill-accent-gold" opacity="0.45" />
		<rect x="132" y="20" width="4" height="4" class="fill-accent-gold" opacity="0.65" />
		<rect x="186" y="40" width="4" height="4" class="fill-accent-gold" opacity="0.4" />
		<rect x="210" y="16" width="4" height="4" class="fill-accent-gold" opacity="0.6" />
		<rect x="296" y="64" width="4" height="4" class="fill-accent-gold" opacity="0.45" />
	{/if}

	<path
		d="M0 152 L0 138 L40 148 L80 140 L120 150 L160 142 L200 150 L240 140 L280 149 L320 142 L320 152 Z"
		class="fill-accent-gold"
		opacity={currentPhase === 2 ? 0.1 : 0.18}
	/>
	<path
		d="M0 164 L40 154 L80 164 L120 155 L160 166 L200 155 L240 165 L280 156 L320 164 L320 180 L0 180 Z"
		class="fill-accent-gold"
		opacity={currentPhase === 2 ? 0.16 : 0.28}
	/>
	<rect
		x="0"
		y="164"
		width="320"
		height="4"
		class="fill-accent-gold"
		opacity={currentPhase === 2 ? 0.22 : 0.4}
	/>

	<g class="foliage">
		<rect x="44" y="104" width="12" height="48" class="fill-accent-pine" opacity="0.9" />
		<rect x="28" y="120" width="16" height="8" class="fill-accent-pine" opacity="0.9" />
		<rect x="28" y="104" width="8" height="16" class="fill-accent-pine" opacity="0.9" />
		<rect x="56" y="128" width="16" height="8" class="fill-accent-pine" opacity="0.9" />
		<rect x="64" y="112" width="8" height="16" class="fill-accent-pine" opacity="0.9" />

		{#if currentPhase === 0}
			<rect x="48" y="96" width="4" height="8" class="fill-accent-love" />
			<rect x="56" y="100" width="4" height="4" class="fill-accent-love" opacity="0.85" />
		{:else}
			<rect x="42" y="96" width="4" height="4" class="fill-accent-love" />
			<rect x="50" y="96" width="4" height="4" class="fill-accent-love" />
			<rect x="46" y="92" width="4" height="4" class="fill-accent-love" />
			<rect x="46" y="100" width="4" height="4" class="fill-accent-love" />
			<rect x="54" y="100" width="4" height="4" class="fill-accent-love" opacity="0.8" />
		{/if}
	</g>

	<g class="foliage">
		<rect x="250" y="124" width="8" height="28" class="fill-accent-pine" opacity="0.78" />
		<rect x="242" y="132" width="8" height="4" class="fill-accent-pine" opacity="0.78" />
		<rect x="242" y="124" width="4" height="8" class="fill-accent-pine" opacity="0.78" />

		{#if currentPhase === 0}
			<rect x="252" y="118" width="4" height="6" class="fill-accent-love" opacity="0.9" />
		{:else}
			<rect x="248" y="120" width="4" height="4" class="fill-accent-love" opacity="0.9" />
			<rect x="256" y="120" width="4" height="4" class="fill-accent-love" opacity="0.9" />
			<rect x="252" y="116" width="4" height="4" class="fill-accent-love" opacity="0.9" />
		{/if}
	</g>

	{#if currentPhase === 2}
		<g transform="translate(78 84)"
			><g class="bats">
				<rect x="4" y="0" width="4" height="8" class="fill-accent-love" opacity="0.85" />
				<rect x="0" y="4" width="4" height="4" class="fill-accent-love" opacity="0.85" />
				<rect x="8" y="4" width="4" height="4" class="fill-accent-love" opacity="0.85" />
			</g></g
		>
		<g transform="translate(96 52)"
			><g class="bats">
				<rect x="4" y="0" width="4" height="8" class="fill-accent-love" opacity="0.6" />
				<rect x="0" y="4" width="4" height="4" class="fill-accent-love" opacity="0.6" />
				<rect x="8" y="4" width="4" height="4" class="fill-accent-love" opacity="0.6" />
			</g></g
		>
		<g transform="translate(228 74)"
			><g class="bats">
				<rect x="4" y="0" width="4" height="8" class="fill-accent-love" opacity="0.5" />
				<rect x="0" y="4" width="4" height="4" class="fill-accent-love" opacity="0.5" />
				<rect x="8" y="4" width="4" height="4" class="fill-accent-love" opacity="0.5" />
			</g></g
		>
	{/if}
</svg>

<style>
	.foliage {
		animation: desert-sway 9s ease-in-out infinite alternate;
		animation-play-state: paused;
		transform-box: fill-box;
		transform-origin: 50% 100%;
	}

	.bats {
		animation: bat-drift 11s ease-in-out infinite alternate;
		animation-play-state: paused;
	}

	svg.animated .foliage,
	svg.animated .bats {
		animation-play-state: running;
	}

	@keyframes desert-sway {
		from {
			transform: translateX(0);
		}
		to {
			transform: translateX(1px);
		}
	}

	@keyframes bat-drift {
		from {
			transform: translate(0, 0);
		}
		to {
			transform: translate(-4px, -4px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.foliage,
		.bats {
			animation: none;
		}
	}
</style>
