<script lang="ts">
	import { findIllustration } from '$lib/domain/illustration/illustration-catalog';

	let { phase = 0, animated = false }: { phase?: number; animated?: boolean } = $props();

	const PHASE_COUNT = findIllustration('forest')?.phaseCount ?? 5;
	const currentPhase = $derived(Math.min(PHASE_COUNT - 1, Math.max(0, Math.floor(phase))));
</script>

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
		d="M0 152 L0 132 L36 116 L72 128 L108 104 L144 126 L180 110 L216 124 L252 102 L288 118 L320 108 L320 152 Z"
		class="fill-text-subtle"
		opacity="0.25"
	/>
	<rect x="0" y="152" width="320" height="28" class="fill-accent-pine" opacity="0.28" />
	<rect x="0" y="152" width="320" height="4" class="fill-accent-pine" opacity="0.55" />

	{#if currentPhase === 0}
		<rect x="148" y="148" width="24" height="4" class="fill-accent-pine" opacity="0.8" />
		<rect x="152" y="144" width="16" height="4" class="fill-accent-pine" opacity="0.8" />
		<rect x="158" y="140" width="4" height="4" class="fill-text-subtle" />
	{:else if currentPhase === 1}
		<rect x="148" y="148" width="24" height="4" class="fill-accent-pine" opacity="0.8" />
		<rect x="152" y="144" width="16" height="4" class="fill-accent-pine" opacity="0.8" />
		<g class="foliage">
			<rect x="94" y="144" width="4" height="8" class="fill-accent-pine" />
			<rect x="86" y="140" width="8" height="4" class="fill-accent-foam" />
			<rect x="98" y="136" width="8" height="4" class="fill-accent-foam" />
		</g>
		<g class="foliage">
			<rect x="158" y="140" width="4" height="12" class="fill-accent-pine" />
			<rect x="150" y="136" width="8" height="4" class="fill-accent-foam" />
			<rect x="162" y="132" width="8" height="4" class="fill-accent-foam" />
		</g>
		<g class="foliage">
			<rect x="222" y="144" width="4" height="8" class="fill-accent-pine" />
			<rect x="214" y="140" width="8" height="4" class="fill-accent-foam" />
			<rect x="226" y="142" width="8" height="4" class="fill-accent-foam" />
		</g>
	{:else if currentPhase === 2}
		<g class="foliage">
			<rect x="106" y="120" width="8" height="32" class="fill-accent-pine" />
			<rect x="98" y="108" width="24" height="16" class="fill-accent-foam" opacity="0.9" />
			<rect x="102" y="100" width="16" height="8" class="fill-accent-foam" />
		</g>
		<g class="foliage">
			<rect x="202" y="124" width="8" height="28" class="fill-accent-pine" />
			<rect x="194" y="112" width="24" height="16" class="fill-accent-foam" opacity="0.9" />
			<rect x="198" y="104" width="16" height="8" class="fill-accent-foam" />
		</g>
		<g class="foliage">
			<rect x="154" y="144" width="4" height="8" class="fill-accent-pine" />
			<rect x="146" y="140" width="8" height="4" class="fill-accent-foam" />
			<rect x="158" y="136" width="8" height="4" class="fill-accent-foam" />
		</g>
	{:else if currentPhase === 3}
		<g class="foliage">
			<rect x="62" y="112" width="8" height="40" class="fill-accent-pine" />
			<rect x="50" y="96" width="32" height="16" class="fill-accent-foam" opacity="0.9" />
			<rect x="54" y="84" width="24" height="12" class="fill-accent-foam" />
			<rect x="62" y="76" width="8" height="8" class="fill-accent-foam" />
		</g>
		<g class="foliage">
			<rect x="150" y="108" width="8" height="44" class="fill-accent-pine" />
			<rect x="138" y="92" width="32" height="16" class="fill-accent-foam" opacity="0.9" />
			<rect x="142" y="80" width="24" height="12" class="fill-accent-foam" />
			<rect x="150" y="72" width="8" height="8" class="fill-accent-foam" />
		</g>
		<g class="foliage">
			<rect x="238" y="116" width="8" height="36" class="fill-accent-pine" />
			<rect x="226" y="100" width="32" height="16" class="fill-accent-foam" opacity="0.9" />
			<rect x="230" y="88" width="24" height="12" class="fill-accent-foam" />
			<rect x="238" y="80" width="8" height="8" class="fill-accent-foam" />
		</g>
		<g class="foliage">
			<rect x="102" y="144" width="4" height="8" class="fill-accent-pine" />
			<rect x="94" y="140" width="8" height="4" class="fill-accent-foam" />
			<rect x="106" y="138" width="8" height="4" class="fill-accent-foam" />
		</g>
	{:else}
		<g class="foliage">
			<rect x="26" y="104" width="8" height="48" class="fill-accent-pine" />
			<rect x="10" y="84" width="40" height="20" class="fill-accent-foam" opacity="0.85" />
			<rect x="16" y="68" width="28" height="16" class="fill-accent-foam" />
			<rect x="24" y="60" width="12" height="8" class="fill-accent-foam" />
		</g>
		<g class="foliage">
			<rect x="90" y="96" width="8" height="56" class="fill-accent-pine" />
			<rect x="72" y="72" width="44" height="24" class="fill-accent-foam" opacity="0.85" />
			<rect x="78" y="56" width="32" height="16" class="fill-accent-foam" />
			<rect x="86" y="48" width="16" height="8" class="fill-accent-foam" />
		</g>
		<g class="foliage">
			<rect x="154" y="108" width="8" height="44" class="fill-accent-pine" />
			<rect x="138" y="88" width="40" height="20" class="fill-accent-foam" opacity="0.85" />
			<rect x="144" y="72" width="28" height="16" class="fill-accent-foam" />
			<rect x="152" y="64" width="12" height="8" class="fill-accent-foam" />
		</g>
		<g class="foliage">
			<rect x="218" y="100" width="8" height="52" class="fill-accent-pine" />
			<rect x="200" y="78" width="44" height="22" class="fill-accent-foam" opacity="0.85" />
			<rect x="206" y="62" width="32" height="16" class="fill-accent-foam" />
			<rect x="214" y="54" width="16" height="8" class="fill-accent-foam" />
		</g>
		<g class="foliage">
			<rect x="286" y="112" width="8" height="40" class="fill-accent-pine" />
			<rect x="270" y="92" width="40" height="20" class="fill-accent-foam" opacity="0.85" />
			<rect x="276" y="76" width="28" height="16" class="fill-accent-foam" />
			<rect x="284" y="68" width="12" height="8" class="fill-accent-foam" />
		</g>
		<rect x="56" y="148" width="16" height="4" class="fill-accent-foam" opacity="0.5" />
		<rect x="182" y="148" width="20" height="4" class="fill-accent-foam" opacity="0.5" />
		<rect x="252" y="148" width="12" height="4" class="fill-accent-foam" opacity="0.5" />
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
