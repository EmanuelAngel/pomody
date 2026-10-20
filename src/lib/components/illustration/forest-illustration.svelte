<script lang="ts">
	import { findIllustration } from '$lib/domain/illustration/illustration-catalog';

	let { phase = 0, animated = false }: { phase?: number; animated?: boolean } = $props();

	const uid = $props.id();
	const ref = (name: string) => `#${uid}-${name}`;

	const PHASE_COUNT = findIllustration('forest')?.phaseCount ?? 5;
	const currentPhase = $derived(Math.min(PHASE_COUNT - 1, Math.max(0, Math.floor(phase))));
	const isGolden = $derived(currentPhase === 4);
	const isDawn = $derived(currentPhase === 0);
</script>

<!--
	Forest companion. Layered pixel landscape: dawn-to-golden sky, two hill
	ranges, grass floor, textured trees and undergrowth. The centre stays
	clear (x 116..204) so the timer keeps its contrast.
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
	<defs>
		<g id={`${uid}-canopy-big`}>
			<rect x="16" y="0" width="12" height="4" />
			<rect x="10" y="4" width="24" height="4" />
			<rect x="6" y="8" width="32" height="6" />
			<rect x="2" y="14" width="40" height="8" />
			<rect x="0" y="22" width="44" height="10" />
			<rect x="4" y="32" width="36" height="8" />
			<rect x="10" y="40" width="24" height="4" />
			<rect x="8" y="18" width="8" height="6" fill="var(--accent-pine)" opacity="0.24" />
			<rect x="28" y="26" width="10" height="6" fill="var(--accent-pine)" opacity="0.2" />
			<rect x="16" y="34" width="8" height="4" fill="var(--accent-pine)" opacity="0.22" />
			<rect x="20" y="8" width="6" height="4" fill="var(--accent-rose)" opacity="0.22" />
		</g>
		<g id={`${uid}-canopy-mid`}>
			<rect x="11" y="0" width="8" height="4" />
			<rect x="6" y="4" width="18" height="4" />
			<rect x="2" y="8" width="26" height="6" />
			<rect x="0" y="14" width="30" height="10" />
			<rect x="4" y="24" width="22" height="6" />
			<rect x="9" y="30" width="12" height="4" />
			<rect x="5" y="14" width="6" height="4" fill="var(--accent-pine)" opacity="0.24" />
			<rect x="19" y="20" width="7" height="4" fill="var(--accent-pine)" opacity="0.2" />
			<rect x="12" y="6" width="5" height="3" fill="var(--accent-rose)" opacity="0.2" />
		</g>
		<g id={`${uid}-canopy-small`}>
			<rect x="7" y="0" width="6" height="3" />
			<rect x="3" y="3" width="14" height="4" />
			<rect x="0" y="7" width="20" height="8" />
			<rect x="3" y="15" width="14" height="5" />
			<rect x="7" y="20" width="6" height="4" />
			<rect x="4" y="9" width="4" height="3" fill="var(--accent-pine)" opacity="0.24" />
		</g>
		<g id={`${uid}-trunk-big`}>
			<rect x="0" y="0" width="8" height="56" />
			<rect x="-4" y="52" width="16" height="4" />
			<rect x="6" y="10" width="8" height="3" />
			<rect x="-6" y="18" width="8" height="3" />
			<rect x="2" y="6" width="2" height="44" opacity="0.3" />
		</g>
		<g id={`${uid}-trunk-mid`}>
			<rect x="0" y="0" width="6" height="36" />
			<rect x="-3" y="33" width="12" height="3" />
			<rect x="4" y="8" width="7" height="3" />
			<rect x="1" y="4" width="2" height="28" opacity="0.3" />
		</g>
		<g id={`${uid}-trunk-small`}>
			<rect x="0" y="0" width="4" height="20" />
			<rect x="-2" y="18" width="8" height="2" />
		</g>
		<g id={`${uid}-sapling`}>
			<rect x="3" y="5" width="2" height="11" fill="var(--accent-pine)" />
			<rect x="1" y="1" width="6" height="7" fill="var(--accent-foam)" />
			<rect x="2" y="0" width="4" height="3" fill="var(--accent-foam)" />
			<rect x="2" y="3" width="2" height="2" fill="var(--accent-pine)" opacity="0.3" />
		</g>
		<g id={`${uid}-bush`}>
			<rect x="0" y="4" width="20" height="4" />
			<rect x="3" y="2" width="6" height="2" />
			<rect x="11" y="0" width="6" height="4" />
			<rect x="6" y="4" width="3" height="2" opacity="0.4" />
		</g>
		<g id={`${uid}-rock`}>
			<rect x="0" y="2" width="10" height="4" />
			<rect x="2" y="0" width="6" height="2" />
		</g>
		<g id={`${uid}-mushroom`}>
			<rect x="3" y="4" width="2" height="4" />
			<rect x="0" y="2" width="8" height="2" />
			<rect x="2" y="0" width="4" height="2" />
		</g>
		<g id={`${uid}-flower`}>
			<rect x="1" y="4" width="2" height="4" />
			<rect x="0" y="0" width="2" height="2" />
			<rect x="2" y="0" width="2" height="2" />
			<rect x="1" y="2" width="2" height="2" />
		</g>
		<g id={`${uid}-cloud`}>
			<rect x="4" y="0" width="20" height="4" />
			<rect x="0" y="4" width="32" height="4" />
			<rect x="8" y="8" width="16" height="2" opacity="0.6" />
		</g>
		<g id={`${uid}-bird`}>
			<rect x="0" y="0" width="4" height="2" />
			<rect x="6" y="0" width="4" height="2" />
			<rect x="4" y="2" width="2" height="2" />
		</g>
		<g id={`${uid}-sun`}>
			<rect x="18" y="0" width="12" height="4" />
			<rect x="14" y="4" width="20" height="4" />
			<rect x="10" y="8" width="28" height="4" />
			<rect x="6" y="12" width="36" height="4" />
			<rect x="2" y="16" width="44" height="4" />
			<rect x="0" y="20" width="48" height="8" />
			<rect x="2" y="28" width="44" height="4" />
			<rect x="6" y="32" width="36" height="4" />
			<rect x="10" y="36" width="28" height="4" />
			<rect x="14" y="40" width="20" height="4" />
			<rect x="18" y="44" width="12" height="4" />
		</g>
		<linearGradient
			id={`${uid}-sky-dawn`}
			gradientUnits="userSpaceOnUse"
			x1="0"
			y1="0"
			x2="0"
			y2="92"
		>
			<stop offset="0" stop-color="var(--accent-iris)" stop-opacity="0.4" />
			<stop offset="0.45" stop-color="var(--accent-rose)" stop-opacity="0.42" />
			<stop offset="0.8" stop-color="var(--accent-gold)" stop-opacity="0.38" />
			<stop offset="1" stop-color="var(--accent-gold)" stop-opacity="0.55" />
		</linearGradient>
		<linearGradient
			id={`${uid}-sky-day`}
			gradientUnits="userSpaceOnUse"
			x1="0"
			y1="0"
			x2="0"
			y2="92"
		>
			<stop offset="0" stop-color="var(--accent-foam)" stop-opacity="0.62" />
			<stop offset="0.45" stop-color="var(--accent-foam)" stop-opacity="0.46" />
			<stop offset="0.78" stop-color="var(--accent-foam)" stop-opacity="0.34" />
			<stop offset="1" stop-color="var(--accent-foam)" stop-opacity="0.26" />
		</linearGradient>
		<linearGradient
			id={`${uid}-sky-golden`}
			gradientUnits="userSpaceOnUse"
			x1="0"
			y1="0"
			x2="0"
			y2="92"
		>
			<stop offset="0" stop-color="var(--accent-gold)" stop-opacity="0.82" />
			<stop offset="0.5" stop-color="var(--accent-rose)" stop-opacity="0.62" />
			<stop offset="1" stop-color="var(--accent-love)" stop-opacity="0.52" />
		</linearGradient>
	</defs>

	<!-- Sky and light -->
	<rect
		x="0"
		y="0"
		width="320"
		height="150"
		fill={`url(#${uid}-sky-${isDawn ? 'dawn' : isGolden ? 'golden' : 'day'})`}
	/>

	{#if isDawn}
		<circle cx="48" cy="108" r="34" class="fill-accent-gold" opacity="0.05" />
		<use href={ref('sun')} x="24" y="84" class="fill-accent-gold" opacity="0.9" />
	{:else if isGolden}
		<circle cx="260" cy="100" r="34" class="fill-accent-gold" opacity="0.05" />
		<use href={ref('sun')} x="236" y="76" class="fill-accent-gold" opacity="0.95" />
	{:else}
		<circle cx="268" cy="36" r="32" class="fill-accent-gold" opacity="0.04" />
		<use href={ref('sun')} x="244" y="12" class="fill-accent-gold" opacity="0.95" />
	{/if}

	<g class="fill-accent-rose" opacity={isDawn ? 0.5 : isGolden ? 0.4 : 0.55}>
		<use href={ref('cloud')} x="34" y="24" />
		<use href={ref('cloud')} x="186" y="16" opacity="0.7" />
		<use href={ref('cloud')} x="266" y="52" opacity="0.55" />
	</g>

	<g class="fill-accent-pine" opacity="0.55">
		<use href={ref('bird')} x="112" y="30" />
		<use href={ref('bird')} x="128" y="24" />
		<use href={ref('bird')} x="208" y="46" opacity="0.8" />
	</g>

	<!-- Far hills -->
	<path
		d="M0 112 L20 100 L44 110 L68 96 L92 108 L116 98 L140 110 L164 96 L188 108 L212 100 L236 110 L260 96 L284 108 L308 100 L320 108 L320 152 L0 152 Z"
		class={isGolden ? 'fill-accent-love' : 'fill-accent-iris'}
		opacity={isGolden ? 0.26 : 0.22}
	/>
	<path
		d="M0 130 L24 116 L48 128 L72 114 L96 126 L120 118 L144 130 L168 116 L192 128 L216 120 L240 130 L264 116 L288 126 L320 118 L320 152 L0 152 Z"
		class="fill-accent-pine"
		opacity="0.3"
	/>

	<!-- Meadow floor -->
	<rect x="0" y="152" width="320" height="28" class="fill-accent-pine" opacity="0.24" />
	<rect x="0" y="152" width="320" height="4" class="fill-accent-pine" opacity="0.45" />
	<rect x="0" y="164" width="320" height="16" class="fill-accent-pine" opacity="0.16" />

	<!-- Grass tufts -->
	<g class="fill-accent-foam" opacity={isGolden ? 0.45 : 0.38}>
		<rect x="14" y="147" width="2" height="5" />
		<rect x="18" y="145" width="2" height="7" />
		<rect x="22" y="148" width="2" height="4" />
		<rect x="58" y="146" width="2" height="6" />
		<rect x="62" y="148" width="2" height="4" />
		<rect x="98" y="147" width="2" height="5" />
		<rect x="102" y="145" width="2" height="7" />
		<rect x="130" y="148" width="2" height="4" />
		<rect x="134" y="146" width="2" height="6" />
		<rect x="166" y="147" width="2" height="5" />
		<rect x="170" y="145" width="2" height="7" />
		<rect x="204" y="148" width="2" height="4" />
		<rect x="208" y="146" width="2" height="6" />
		<rect x="248" y="147" width="2" height="5" />
		<rect x="252" y="145" width="2" height="7" />
		<rect x="288" y="148" width="2" height="4" />
		<rect x="292" y="146" width="2" height="6" />
	</g>

	{#if currentPhase === 0}
		<rect x="64" y="146" width="24" height="4" class="fill-accent-pine" opacity="0.7" />
		<rect x="68" y="142" width="16" height="4" class="fill-accent-pine" opacity="0.7" />
		<rect x="74" y="138" width="4" height="4" class="fill-accent-gold" />
		<use href={ref('bush')} x="40" y="146" class="fill-accent-pine" opacity="0.55" />
		<use href={ref('bush')} x="262" y="146" class="fill-accent-pine" opacity="0.55" />
	{:else if currentPhase === 1}
		<use href={ref('sapling')} x="26" y="132" class="fill-accent-pine" />
		<use href={ref('sapling')} x="64" y="130" class="fill-accent-pine" />
		<use href={ref('sapling')} x="100" y="134" class="fill-accent-pine" />
		<use href={ref('sapling')} x="218" y="134" class="fill-accent-pine" />
		<use href={ref('sapling')} x="256" y="130" class="fill-accent-pine" />
		<use href={ref('sapling')} x="292" y="132" class="fill-accent-pine" />
		<use href={ref('bush')} x="118" y="146" class="fill-accent-foam" opacity="0.7" />
		<use href={ref('bush')} x="182" y="146" class="fill-accent-foam" opacity="0.7" />
	{:else if currentPhase === 2}
		<g class="foliage">
			<use href={ref('canopy-small')} x="20" y="108" class="fill-accent-foam" opacity="0.95" />
			<use href={ref('canopy-small')} x="280" y="108" class="fill-accent-foam" opacity="0.95" />
		</g>
		<use href={ref('trunk-small')} x="28" y="132" class="fill-accent-pine" />
		<use href={ref('trunk-small')} x="288" y="132" class="fill-accent-pine" />
		<use href={ref('sapling')} x="58" y="130" class="fill-accent-pine" />
		<use href={ref('sapling')} x="94" y="134" class="fill-accent-pine" />
		<use href={ref('sapling')} x="218" y="134" class="fill-accent-pine" />
		<use href={ref('sapling')} x="254" y="130" class="fill-accent-pine" />
		<use href={ref('bush')} x="120" y="146" class="fill-accent-foam" opacity="0.75" />
		<use href={ref('bush')} x="184" y="146" class="fill-accent-foam" opacity="0.75" />
	{:else if currentPhase === 3}
		<g class="foliage">
			<use href={ref('canopy-mid')} x="10" y="82" class="fill-accent-foam" opacity="0.95" />
			<use href={ref('canopy-mid')} x="280" y="82" class="fill-accent-foam" opacity="0.95" />
			<use href={ref('canopy-small')} x="90" y="108" class="fill-accent-foam" opacity="0.9" />
			<use href={ref('canopy-small')} x="210" y="108" class="fill-accent-foam" opacity="0.9" />
		</g>
		<use href={ref('trunk-mid')} x="22" y="116" class="fill-accent-pine" />
		<use href={ref('trunk-mid')} x="292" y="116" class="fill-accent-pine" />
		<use href={ref('trunk-small')} x="98" y="132" class="fill-accent-pine" />
		<use href={ref('trunk-small')} x="218" y="132" class="fill-accent-pine" />
		<use href={ref('bush')} x="58" y="146" class="fill-accent-foam" opacity="0.8" />
		<use href={ref('bush')} x="244" y="146" class="fill-accent-foam" opacity="0.8" />
		<use href={ref('rock')} x="120" y="148" class="fill-accent-pine" opacity="0.55" />
		<use href={ref('rock')} x="186" y="148" class="fill-accent-pine" opacity="0.5" />
	{:else}
		<g class="foliage">
			<use href={ref('canopy-big')} x="0" y="54" class="fill-accent-foam" opacity="0.95" />
			<use href={ref('canopy-big')} x="276" y="54" class="fill-accent-foam" opacity="0.95" />
			<use href={ref('canopy-mid')} x="54" y="82" class="fill-accent-foam" opacity="0.9" />
			<use href={ref('canopy-mid')} x="236" y="82" class="fill-accent-foam" opacity="0.9" />
			<use href={ref('canopy-small')} x="94" y="108" class="fill-accent-foam" opacity="0.85" />
			<use href={ref('canopy-small')} x="206" y="108" class="fill-accent-foam" opacity="0.85" />
		</g>
		<use href={ref('trunk-big')} x="18" y="96" class="fill-accent-pine" />
		<use href={ref('trunk-big')} x="294" y="96" class="fill-accent-pine" />
		<use href={ref('trunk-mid')} x="66" y="116" class="fill-accent-pine" />
		<use href={ref('trunk-mid')} x="248" y="116" class="fill-accent-pine" />
		<use href={ref('trunk-small')} x="102" y="132" class="fill-accent-pine" />
		<use href={ref('trunk-small')} x="214" y="132" class="fill-accent-pine" />
		<use href={ref('bush')} x="60" y="146" class="fill-accent-foam" opacity="0.8" />
		<use href={ref('bush')} x="240" y="146" class="fill-accent-foam" opacity="0.8" />
		<use href={ref('bush')} x="124" y="146" class="fill-accent-foam" opacity="0.65" />
		<use href={ref('bush')} x="176" y="146" class="fill-accent-foam" opacity="0.65" />
		<use href={ref('rock')} x="88" y="148" class="fill-accent-pine" opacity="0.5" />
		<use href={ref('rock')} x="222" y="148" class="fill-accent-pine" opacity="0.5" />
		<use href={ref('mushroom')} x="80" y="144" class="fill-accent-love" opacity="0.85" />
		<use href={ref('mushroom')} x="236" y="144" class="fill-accent-love" opacity="0.85" />
		<use href={ref('flower')} x="118" y="146" class="fill-accent-gold" opacity="0.9" />
		<use href={ref('flower')} x="196" y="146" class="fill-accent-gold" opacity="0.9" />
		<g class="fill-accent-gold" opacity="0.9">
			<rect x="46" y="126" width="2" height="2" />
			<rect x="76" y="138" width="2" height="2" opacity="0.7" />
			<rect x="118" y="128" width="2" height="2" opacity="0.8" />
			<rect x="148" y="140" width="2" height="2" opacity="0.6" />
			<rect x="178" y="126" width="2" height="2" opacity="0.8" />
			<rect x="214" y="136" width="2" height="2" opacity="0.7" />
			<rect x="256" y="128" width="2" height="2" />
		</g>
	{/if}

	<!-- Foreground shadow band -->
	<path
		d="M0 172 Q40 168 80 172 T160 172 T240 172 T320 172 L320 180 L0 180 Z"
		class="fill-accent-pine"
		opacity={isGolden ? 0.26 : 0.2}
	/>
</svg>

<style>
	.foliage {
		animation: forest-sway 8s ease-in-out infinite alternate;
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
