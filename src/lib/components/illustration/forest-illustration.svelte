<script lang="ts">
	import { findIllustration } from '$lib/domain/illustration/illustration-catalog';

	let { phase = 0, animated = false }: { phase?: number; animated?: boolean } = $props();

	const PHASE_COUNT = findIllustration('forest')?.phaseCount ?? 5;
	const currentPhase = $derived(Math.min(PHASE_COUNT - 1, Math.max(0, Math.floor(phase))));
</script>

<!--
	Composition: the centre (x 116..204) stays clear so the timer keeps its
	contrast. Trees grow only on the sides, framing a meadow clearing.
-->
<svg
	viewBox="0 0 320 180"
	width="100%"
	height="100%"
	preserveAspectRatio="xMidYMax slice"
	class="block h-full w-full"
	class:animated
	data-illustration="forest"
	data-phase={currentPhase}
	shape-rendering="crispEdges"
	aria-hidden="true"
	role="presentation"
>
	<path
		d="M0 152 L0 142 L24 134 L48 141 L72 132 L96 142 L120 136 L144 143 L168 135 L192 142 L216 133 L240 141 L264 132 L288 140 L320 134 L320 152 Z"
		class="fill-text-subtle"
		opacity="0.16"
	/>
	<rect x="0" y="152" width="320" height="28" class="fill-accent-pine" opacity="0.26" />
	<rect x="0" y="152" width="320" height="4" class="fill-accent-pine" opacity="0.5" />

	{#if currentPhase === 0}
		<rect x="44" y="148" width="24" height="4" class="fill-accent-pine" opacity="0.8" />
		<rect x="48" y="144" width="16" height="4" class="fill-accent-pine" opacity="0.8" />
		<rect x="54" y="140" width="4" height="4" class="fill-text-subtle" />
		<rect x="272" y="148" width="12" height="4" class="fill-accent-foam" opacity="0.5" />
		<rect x="28" y="148" width="8" height="4" class="fill-accent-foam" opacity="0.45" />
	{:else if currentPhase === 1}
		<rect x="44" y="148" width="24" height="4" class="fill-accent-pine" opacity="0.8" />
		<g class="foliage">
			<rect x="38" y="144" width="4" height="8" class="fill-accent-pine" />
			<rect x="30" y="140" width="8" height="4" class="fill-accent-foam" />
			<rect x="42" y="136" width="8" height="4" class="fill-accent-foam" />
		</g>
		<g class="foliage">
			<rect x="82" y="142" width="4" height="10" class="fill-accent-pine" />
			<rect x="74" y="138" width="8" height="4" class="fill-accent-foam" />
			<rect x="86" y="134" width="8" height="4" class="fill-accent-foam" />
		</g>
		<g class="foliage">
			<rect x="234" y="144" width="4" height="8" class="fill-accent-pine" />
			<rect x="226" y="140" width="8" height="4" class="fill-accent-foam" />
			<rect x="238" y="136" width="8" height="4" class="fill-accent-foam" />
		</g>
		<g class="foliage">
			<rect x="278" y="142" width="4" height="10" class="fill-accent-pine" />
			<rect x="270" y="138" width="8" height="4" class="fill-accent-foam" />
			<rect x="282" y="134" width="8" height="4" class="fill-accent-foam" />
		</g>
	{:else if currentPhase === 2}
		<g class="foliage">
			<rect x="42" y="124" width="8" height="28" class="fill-accent-pine" />
			<rect x="28" y="108" width="28" height="16" class="fill-accent-foam" opacity="0.9" />
			<rect x="34" y="100" width="16" height="8" class="fill-accent-foam" />
		</g>
		<g class="foliage">
			<rect x="284" y="124" width="8" height="28" class="fill-accent-pine" />
			<rect x="270" y="108" width="28" height="16" class="fill-accent-foam" opacity="0.9" />
			<rect x="276" y="100" width="16" height="8" class="fill-accent-foam" />
		</g>
		<g class="foliage">
			<rect x="118" y="144" width="4" height="8" class="fill-accent-pine" />
			<rect x="110" y="140" width="8" height="4" class="fill-accent-foam" />
			<rect x="122" y="136" width="8" height="4" class="fill-accent-foam" />
		</g>
		<g class="foliage">
			<rect x="198" y="144" width="4" height="8" class="fill-accent-pine" />
			<rect x="190" y="140" width="8" height="4" class="fill-accent-foam" />
			<rect x="202" y="136" width="8" height="4" class="fill-accent-foam" />
		</g>
	{:else if currentPhase === 3}
		<g class="foliage">
			<rect x="36" y="112" width="8" height="40" class="fill-accent-pine" />
			<rect x="20" y="96" width="32" height="16" class="fill-accent-foam" opacity="0.9" />
			<rect x="26" y="84" width="20" height="12" class="fill-accent-foam" />
			<rect x="34" y="76" width="8" height="8" class="fill-accent-foam" />
		</g>
		<g class="foliage">
			<rect x="292" y="116" width="8" height="36" class="fill-accent-pine" />
			<rect x="276" y="100" width="32" height="16" class="fill-accent-foam" opacity="0.9" />
			<rect x="282" y="88" width="20" height="12" class="fill-accent-foam" />
			<rect x="290" y="80" width="8" height="8" class="fill-accent-foam" />
		</g>
		<g class="foliage">
			<rect x="86" y="132" width="8" height="20" class="fill-accent-pine" />
			<rect x="74" y="120" width="24" height="12" class="fill-accent-foam" opacity="0.9" />
			<rect x="80" y="112" width="12" height="8" class="fill-accent-foam" />
		</g>
		<g class="foliage">
			<rect x="238" y="132" width="8" height="20" class="fill-accent-pine" />
			<rect x="226" y="120" width="24" height="12" class="fill-accent-foam" opacity="0.9" />
			<rect x="230" y="112" width="12" height="8" class="fill-accent-foam" />
		</g>
		<g class="foliage">
			<rect x="120" y="144" width="4" height="8" class="fill-accent-pine" />
			<rect x="112" y="140" width="8" height="4" class="fill-accent-foam" />
			<rect x="124" y="136" width="8" height="4" class="fill-accent-foam" />
		</g>
		<g class="foliage">
			<rect x="198" y="144" width="4" height="8" class="fill-accent-pine" />
			<rect x="190" y="140" width="8" height="4" class="fill-accent-foam" />
			<rect x="202" y="136" width="8" height="4" class="fill-accent-foam" />
		</g>
	{:else}
		<g class="foliage">
			<rect x="20" y="100" width="8" height="52" class="fill-accent-pine" />
			<rect x="4" y="80" width="40" height="20" class="fill-accent-foam" opacity="0.85" />
			<rect x="10" y="64" width="28" height="16" class="fill-accent-foam" />
			<rect x="16" y="56" width="16" height="8" class="fill-accent-foam" />
		</g>
		<g class="foliage">
			<rect x="68" y="112" width="8" height="40" class="fill-accent-pine" />
			<rect x="52" y="92" width="36" height="20" class="fill-accent-foam" opacity="0.85" />
			<rect x="58" y="80" width="24" height="12" class="fill-accent-foam" />
			<rect x="64" y="72" width="12" height="8" class="fill-accent-foam" />
		</g>
		<g class="foliage">
			<rect x="102" y="124" width="8" height="28" class="fill-accent-pine" />
			<rect x="88" y="108" width="28" height="16" class="fill-accent-foam" opacity="0.85" />
			<rect x="94" y="100" width="16" height="8" class="fill-accent-foam" />
		</g>
		<g class="foliage">
			<rect x="218" y="124" width="8" height="28" class="fill-accent-pine" />
			<rect x="204" y="108" width="28" height="16" class="fill-accent-foam" opacity="0.85" />
			<rect x="210" y="100" width="16" height="8" class="fill-accent-foam" />
		</g>
		<g class="foliage">
			<rect x="286" y="104" width="8" height="48" class="fill-accent-pine" />
			<rect x="268" y="84" width="40" height="20" class="fill-accent-foam" opacity="0.85" />
			<rect x="274" y="68" width="28" height="16" class="fill-accent-foam" />
			<rect x="280" y="60" width="16" height="8" class="fill-accent-foam" />
		</g>
		<g class="foliage">
			<rect x="308" y="118" width="8" height="34" class="fill-accent-pine" />
			<rect x="296" y="100" width="24" height="18" class="fill-accent-foam" opacity="0.85" />
			<rect x="300" y="92" width="16" height="8" class="fill-accent-foam" />
		</g>
		<rect x="136" y="148" width="20" height="4" class="fill-accent-foam" opacity="0.5" />
		<rect x="168" y="148" width="12" height="4" class="fill-accent-foam" opacity="0.5" />
		<rect x="122" y="148" width="8" height="4" class="fill-accent-foam" opacity="0.4" />
		<rect x="190" y="148" width="8" height="4" class="fill-accent-foam" opacity="0.4" />
	{/if}
</svg>

<style>
	.foliage {
		animation: forest-sway 7s ease-in-out infinite alternate;
		animation-play-state: paused;
		transform-box: fill-box;
		transform-origin: 50% 100%;
	}

	svg.animated .foliage {
		animation-play-state: running;
	}

	@keyframes forest-sway {
		from {
			transform: translateX(0);
		}
		to {
			transform: translateX(1px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.foliage {
			animation: none;
		}
	}
</style>
