<script lang="ts">
	import { findIllustration } from '$lib/domain/illustration/illustration-catalog';

	let { phase = 0, animated = false }: { phase?: number; animated?: boolean } = $props();

	const PHASE_COUNT = findIllustration('desert')?.phaseCount ?? 3;
	const currentPhase = $derived(Math.min(PHASE_COUNT - 1, Math.max(0, Math.floor(phase))));
</script>

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
		<rect x="252" y="20" width="28" height="28" class="fill-accent-gold" opacity="0.9" />
		<rect x="256" y="16" width="20" height="4" class="fill-accent-gold" opacity="0.6" />
		<rect x="248" y="24" width="4" height="20" class="fill-accent-gold" opacity="0.6" />
	{:else if currentPhase === 1}
		<rect x="240" y="76" width="36" height="28" class="fill-accent-gold" opacity="0.95" />
		<rect x="236" y="84" width="4" height="12" class="fill-accent-gold" opacity="0.5" />
		<rect x="276" y="84" width="4" height="12" class="fill-accent-gold" opacity="0.5" />
	{:else}
		<rect x="250" y="20" width="26" height="26" class="fill-accent-gold" opacity="0.85" />
		<rect x="258" y="24" width="22" height="22" class="fill-bg-base" />
		<rect x="40" y="28" width="4" height="4" class="fill-accent-gold" opacity="0.8" />
		<rect x="76" y="48" width="4" height="4" class="fill-accent-gold" opacity="0.5" />
		<rect x="132" y="20" width="4" height="4" class="fill-accent-gold" opacity="0.7" />
		<rect x="186" y="40" width="4" height="4" class="fill-accent-gold" opacity="0.45" />
		<rect x="210" y="16" width="4" height="4" class="fill-accent-gold" opacity="0.65" />
		<rect x="296" y="60" width="4" height="4" class="fill-accent-gold" opacity="0.5" />
	{/if}

	<path
		d="M0 152 L0 124 L44 140 L88 128 L132 142 L176 130 L220 144 L264 132 L320 146 L320 152 Z"
		class="fill-accent-gold"
		opacity={currentPhase === 2 ? 0.12 : 0.22}
	/>
	<path
		d="M0 164 L36 152 L76 164 L120 154 L164 166 L208 154 L252 166 L296 156 L320 162 L320 180 L0 180 Z"
		class="fill-accent-gold"
		opacity={currentPhase === 2 ? 0.18 : 0.32}
	/>
	<rect
		x="0"
		y="164"
		width="320"
		height="4"
		class="fill-accent-gold"
		opacity={currentPhase === 2 ? 0.24 : 0.45}
	/>

	<g class="foliage">
		<rect x="96" y="100" width="12" height="52" class="fill-accent-pine" opacity="0.9" />
		<rect x="80" y="116" width="16" height="8" class="fill-accent-pine" opacity="0.9" />
		<rect x="80" y="100" width="8" height="16" class="fill-accent-pine" opacity="0.9" />
		<rect x="108" y="124" width="16" height="8" class="fill-accent-pine" opacity="0.9" />
		<rect x="116" y="108" width="8" height="16" class="fill-accent-pine" opacity="0.9" />

		{#if currentPhase === 0}
			<rect x="100" y="92" width="4" height="8" class="fill-accent-love" />
		{:else}
			<rect x="94" y="88" width="4" height="4" class="fill-accent-love" />
			<rect x="102" y="88" width="4" height="4" class="fill-accent-love" />
			<rect x="98" y="84" width="4" height="4" class="fill-accent-love" />
			<rect x="98" y="92" width="4" height="4" class="fill-accent-love" />
		{/if}
	</g>

	<g class="foliage">
		<rect x="228" y="124" width="8" height="28" class="fill-accent-pine" opacity="0.75" />
		<rect x="220" y="132" width="8" height="4" class="fill-accent-pine" opacity="0.75" />
		<rect x="220" y="124" width="4" height="8" class="fill-accent-pine" opacity="0.75" />

		{#if currentPhase === 0}
			<rect x="230" y="118" width="4" height="6" class="fill-accent-love" opacity="0.9" />
		{:else}
			<rect x="226" y="116" width="4" height="4" class="fill-accent-love" opacity="0.9" />
			<rect x="234" y="116" width="4" height="4" class="fill-accent-love" opacity="0.9" />
			<rect x="230" y="112" width="4" height="4" class="fill-accent-love" opacity="0.9" />
		{/if}
	</g>

	{#if currentPhase === 2}
		<g transform="translate(148 86)"
			><g class="bats">
				<rect x="4" y="0" width="4" height="8" class="fill-accent-love" opacity="0.85" />
				<rect x="0" y="4" width="4" height="4" class="fill-accent-love" opacity="0.85" />
				<rect x="8" y="4" width="4" height="4" class="fill-accent-love" opacity="0.85" />
			</g></g
		>
		<g transform="translate(184 70)"
			><g class="bats">
				<rect x="4" y="0" width="4" height="8" class="fill-accent-love" opacity="0.6" />
				<rect x="0" y="4" width="4" height="4" class="fill-accent-love" opacity="0.6" />
				<rect x="8" y="4" width="4" height="4" class="fill-accent-love" opacity="0.6" />
			</g></g
		>
		<g transform="translate(120 64)"
			><g class="bats">
				<rect x="4" y="0" width="4" height="8" class="fill-accent-love" opacity="0.45" />
				<rect x="0" y="4" width="4" height="4" class="fill-accent-love" opacity="0.45" />
				<rect x="8" y="4" width="4" height="4" class="fill-accent-love" opacity="0.45" />
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
