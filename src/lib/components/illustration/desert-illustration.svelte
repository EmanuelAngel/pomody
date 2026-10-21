<script lang="ts">
	import { findIllustration } from '$lib/domain/illustration/illustration-catalog';

	let { phase = 0, animated = false }: { phase?: number; animated?: boolean } = $props();

	const uid = $props.id();
	const ref = (name: string) => `#${uid}-${name}`;

	const PHASE_COUNT = findIllustration('desert')?.phaseCount ?? 3;
	const currentPhase = $derived(Math.min(PHASE_COUNT - 1, Math.max(0, Math.floor(phase))));
	const isNight = $derived(currentPhase === 2);
</script>

<!--
	Desert companion. Layered pixel landscape: banded sky, three mountain
	ranges, dunes, saguaros with ridges and flowers, rocks and wildlife.
	Palette: Rosé Pine tokens with opacity shades, so every phase adapts to
	Dark, Dawn and OLED. The centre stays readable for the timer.
-->
<svg
	viewBox="0 0 320 180"
	width="100%"
	height="100%"
	preserveAspectRatio="xMidYMax slice"
	class="block size-full"
	class:animated
	data-illustration="desert"
	data-phase={currentPhase}
	shape-rendering="crispEdges"
	aria-hidden="true"
	role="presentation"
>
	<defs>
		<g id={`${uid}-cactus-tall`}>
			<rect x="10" y="0" width="8" height="56" />
			<rect x="0" y="16" width="10" height="6" />
			<rect x="0" y="6" width="6" height="14" />
			<rect x="18" y="24" width="10" height="6" />
			<rect x="22" y="12" width="6" height="16" />
			<rect x="12" y="4" width="2" height="50" opacity="0.22" />
			<rect x="16" y="4" width="2" height="50" opacity="0.14" />
		</g>
		<g id={`${uid}-cactus-mid`}>
			<rect x="7" y="0" width="6" height="36" />
			<rect x="0" y="12" width="7" height="4" />
			<rect x="0" y="4" width="4" height="12" />
			<rect x="13" y="18" width="7" height="4" />
			<rect x="16" y="10" width="4" height="12" />
			<rect x="9" y="2" width="2" height="32" opacity="0.2" />
		</g>
		<g id={`${uid}-cactus-small`}>
			<rect x="4" y="0" width="4" height="20" />
			<rect x="0" y="8" width="4" height="3" />
			<rect x="0" y="4" width="3" height="6" />
			<rect x="8" y="12" width="4" height="3" />
			<rect x="9" y="8" width="3" height="6" />
		</g>
		<g id={`${uid}-flower-open`}>
			<rect x="4" y="0" width="4" height="4" />
			<rect x="0" y="4" width="4" height="4" />
			<rect x="4" y="4" width="4" height="4" opacity="0.55" />
			<rect x="8" y="4" width="4" height="4" />
			<rect x="4" y="8" width="4" height="4" />
		</g>
		<g id={`${uid}-rock`}>
			<rect x="0" y="2" width="12" height="4" />
			<rect x="2" y="0" width="8" height="2" />
			<rect x="8" y="0" width="2" height="2" opacity="0.5" />
		</g>
		<g id={`${uid}-bush`}>
			<rect x="0" y="2" width="16" height="4" />
			<rect x="2" y="0" width="4" height="2" />
			<rect x="8" y="0" width="4" height="2" />
			<rect x="12" y="0" width="2" height="2" opacity="0.6" />
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
		<g id={`${uid}-bat`}>
			<rect x="4" y="0" width="4" height="8" />
			<rect x="0" y="2" width="4" height="4" />
			<rect x="8" y="2" width="4" height="4" />
			<rect x="0" y="0" width="2" height="2" />
			<rect x="10" y="0" width="2" height="2" />
		</g>
		<linearGradient
			id={`${uid}-sky-day`}
			gradientUnits="userSpaceOnUse"
			x1="0"
			y1="0"
			x2="0"
			y2="92"
		>
			<stop offset="0" stop-color="var(--accent-foam)" stop-opacity="0.88" />
			<stop offset="0.3" stop-color="var(--accent-foam)" stop-opacity="0.62" />
			<stop offset="0.62" stop-color="var(--accent-gold)" stop-opacity="0.38" />
			<stop offset="1" stop-color="var(--accent-rose)" stop-opacity="0.55" />
		</linearGradient>
		<linearGradient
			id={`${uid}-sky-sunset`}
			gradientUnits="userSpaceOnUse"
			x1="0"
			y1="0"
			x2="0"
			y2="92"
		>
			<stop offset="0" stop-color="var(--accent-love)" stop-opacity="0.62" />
			<stop offset="0.32" stop-color="var(--accent-love)" stop-opacity="0.74" />
			<stop offset="0.6" stop-color="var(--accent-rose)" stop-opacity="0.78" />
			<stop offset="1" stop-color="var(--accent-gold)" stop-opacity="0.82" />
		</linearGradient>
		<linearGradient
			id={`${uid}-sky-night`}
			gradientUnits="userSpaceOnUse"
			x1="0"
			y1="0"
			x2="0"
			y2="92"
		>
			<stop offset="0" stop-color="var(--accent-iris)" stop-opacity="0.4" />
			<stop offset="0.34" stop-color="var(--accent-iris)" stop-opacity="0.26" />
			<stop offset="0.64" stop-color="var(--accent-pine)" stop-opacity="0.3" />
			<stop offset="1" stop-color="var(--accent-pine)" stop-opacity="0.2" />
		</linearGradient>
	</defs>

	<!-- Sky -->
	<rect
		x="0"
		y="0"
		width="320"
		height="150"
		fill={`url(#${uid}-sky-${currentPhase === 0 ? 'day' : currentPhase === 1 ? 'sunset' : 'night'})`}
	/>

	<!-- Sun or moon -->
	{#if currentPhase === 0}
		<circle cx="260" cy="34" r="30" class="fill-accent-gold" opacity="0.05" />
		<rect x="248" y="18" width="12" height="4" class="fill-accent-gold" />
		<rect x="244" y="22" width="20" height="4" class="fill-accent-gold" />
		<rect x="240" y="26" width="28" height="16" class="fill-accent-gold" />
		<rect x="244" y="42" width="20" height="4" class="fill-accent-gold" />
		<rect x="248" y="46" width="12" height="4" class="fill-accent-gold" />
	{:else if currentPhase === 1}
		<circle cx="240" cy="86" r="30" class="fill-accent-gold" opacity="0.06" />
		<rect x="234" y="70" width="12" height="4" class="fill-accent-rose" opacity="0.95" />
		<rect x="230" y="74" width="20" height="4" class="fill-accent-rose" opacity="0.95" />
		<rect x="226" y="78" width="28" height="16" class="fill-accent-rose" opacity="0.95" />
		<rect x="230" y="94" width="20" height="4" class="fill-accent-rose" opacity="0.95" />
		<rect x="234" y="98" width="12" height="4" class="fill-accent-rose" opacity="0.95" />
	{:else}
		<circle cx="256" cy="32" r="26" class="fill-accent-foam" opacity="0.05" />
		<rect x="248" y="20" width="12" height="4" class="fill-accent-foam" opacity="0.9" />
		<rect x="244" y="24" width="20" height="4" class="fill-accent-foam" opacity="0.9" />
		<rect x="240" y="28" width="28" height="12" class="fill-accent-foam" opacity="0.9" />
		<rect x="244" y="40" width="20" height="4" class="fill-accent-foam" opacity="0.9" />
		<rect x="248" y="44" width="12" height="4" class="fill-accent-foam" opacity="0.9" />
		<rect x="252" y="30" width="6" height="6" class="fill-accent-foam" opacity="0.35" />
		<rect x="260" y="36" width="4" height="4" class="fill-accent-foam" opacity="0.3" />
	{/if}

	<!-- Clouds and stars -->
	{#if currentPhase === 0}
		<g class="fill-accent-rose" opacity="0.85">
			<use href={ref('cloud')} x="28" y="26" />
			<use href={ref('cloud')} x="74" y="46" opacity="0.7" />
			<use href={ref('cloud')} x="196" y="58" opacity="0.55" />
			<use href={ref('cloud')} x="280" y="34" opacity="0.8" />
		</g>
		<g class="fill-accent-love" opacity="0.7">
			<use href={ref('bird')} x="108" y="34" />
			<use href={ref('bird')} x="124" y="28" />
			<use href={ref('bird')} x="204" y="52" />
		</g>
	{:else if currentPhase === 1}
		<g class="fill-accent-rose" opacity="0.9">
			<use href={ref('cloud')} x="44" y="28" />
			<use href={ref('cloud')} x="118" y="42" opacity="0.7" />
			<use href={ref('cloud')} x="246" y="38" opacity="0.6" />
		</g>
		<g class="fill-accent-love" opacity="0.8">
			<use href={ref('bird')} x="96" y="30" />
			<use href={ref('bird')} x="112" y="24" />
		</g>
	{:else}
		<g class="fill-accent-foam" opacity="0.85">
			<rect x="34" y="22" width="2" height="2" />
			<rect x="62" y="40" width="2" height="2" opacity="0.6" />
			<rect x="86" y="18" width="2" height="2" opacity="0.8" />
			<rect x="118" y="34" width="2" height="2" opacity="0.5" />
			<rect x="146" y="14" width="2" height="2" />
			<rect x="176" y="42" width="2" height="2" opacity="0.6" />
			<rect x="204" y="20" width="2" height="2" opacity="0.7" />
			<rect x="222" y="56" width="2" height="2" opacity="0.5" />
			<rect x="288" y="30" width="2" height="2" opacity="0.8" />
			<rect x="306" y="58" width="2" height="2" opacity="0.6" />
			<rect x="52" y="58" width="4" height="4" opacity="0.7" />
			<rect x="166" y="26" width="4" height="4" opacity="0.5" />
		</g>
		<g class="fill-accent-love" opacity="0.7">
			<use href={ref('bat')} x="66" y="66" />
			<use href={ref('bat')} x="228" y="56" opacity="0.8" />
			<use href={ref('bat')} x="190" y="92" opacity="0.6" />
		</g>
	{/if}

	<!-- Mountain ranges -->
	<path
		d="M0 100 L14 88 L28 96 L42 82 L58 94 L72 86 L88 98 L104 84 L120 96 L136 88 L152 98 L168 86 L184 96 L200 84 L216 96 L232 88 L248 82 L264 94 L280 86 L296 96 L320 90 L320 132 L0 132 Z"
		class={isNight ? 'fill-accent-iris' : 'fill-accent-rose'}
		opacity={isNight ? 0.25 : 0.35}
	/>
	<path
		d="M0 114 L18 98 L36 110 L54 94 L72 108 L90 100 L108 112 L126 96 L144 110 L162 102 L180 114 L198 98 L216 110 L234 102 L252 112 L270 96 L288 108 L306 100 L320 110 L320 138 L0 138 Z"
		class={isNight ? 'fill-accent-pine' : 'fill-accent-love'}
		opacity={isNight ? 0.4 : 0.52}
	/>
	<path
		d="M0 126 L24 112 L48 124 L72 110 L96 122 L120 114 L144 126 L168 112 L192 124 L216 116 L240 126 L264 112 L288 122 L320 114 L320 148 L0 148 Z"
		class={isNight ? 'fill-accent-pine' : 'fill-accent-gold'}
		opacity={isNight ? 0.58 : currentPhase === 0 ? 0.6 : 0.72}
	/>

	<!-- Dunes -->
	<path
		d="M0 144 Q30 138 60 143 T120 143 T180 143 T240 143 T300 143 L320 142 L320 180 L0 180 Z"
		class={isNight ? 'fill-accent-pine' : 'fill-accent-gold'}
		opacity={isNight ? 0.18 : 0.34}
	/>
	<path
		d="M0 152 Q40 146 80 152 T160 152 T240 152 T320 152 L320 180 L0 180 Z"
		class={isNight ? 'fill-accent-pine' : 'fill-accent-gold'}
		opacity={isNight ? 0.24 : 0.48}
	/>
	<rect
		x="0"
		y="158"
		width="320"
		height="22"
		class="fill-accent-gold"
		opacity={isNight ? 0.16 : 0.55}
	/>

	<!-- Saguaros -->
	<g class="foliage" opacity={isNight ? 0.62 : 0.92}>
		<g class="fill-accent-pine">
			<use href={ref('cactus-small')} x="24" y="120" />
			<use href={ref('cactus-tall')} x="8" y="90" />
			<use href={ref('cactus-mid')} x="58" y="106" />
			<use href={ref('cactus-small')} x="104" y="124" />
			<use href={ref('cactus-small')} x="154" y="122" />
			<use href={ref('cactus-mid')} x="196" y="104" />
			<use href={ref('cactus-small')} x="222" y="118" />
			<use href={ref('cactus-mid')} x="252" y="110" />
			<use href={ref('cactus-tall')} x="282" y="88" />
			<use href={ref('cactus-small')} x="302" y="126" />
		</g>
	</g>

	<!-- Flowers: buds by day, open at sunset, glowing at night -->
	{#if currentPhase === 0}
		<g class="fill-accent-love" opacity="0.9">
			<rect x="16" y="82" width="4" height="8" />
			<rect x="290" y="80" width="4" height="8" />
			<rect x="63" y="98" width="4" height="8" />
		</g>
	{:else}
		<g class={isNight ? 'fill-accent-gold' : 'fill-accent-love'}>
			<use href={ref('flower-open')} x="14" y="78" />
			<use href={ref('flower-open')} x="288" y="76" />
			<use href={ref('flower-open')} x="61" y="94" />
			<use href={ref('flower-open')} x="199" y="92" />
			<use href={ref('flower-open')} x="255" y="98" />
		</g>
	{/if}

	<!-- Ground detail -->
	<g class="fill-accent-pine" opacity={isNight ? 0.3 : 0.55}>
		<use href={ref('rock')} x="80" y="146" />
		<use href={ref('rock')} x="140" y="150" opacity="0.8" />
		<use href={ref('rock')} x="210" y="148" opacity="0.9" />
		<use href={ref('rock')} x="270" y="150" opacity="0.7" />
		<use href={ref('bush')} x="28" y="148" />
		<use href={ref('bush')} x="118" y="152" opacity="0.8" />
		<use href={ref('bush')} x="246" y="152" opacity="0.7" />
	</g>

	<!-- Foreground shadow band keeps the cacti grounded -->
	<path
		d="M0 172 Q40 168 80 172 T160 172 T240 172 T320 172 L320 180 L0 180 Z"
		class="fill-accent-pine"
		opacity={isNight ? 0.2 : 0.22}
	/>
</svg>

<style>
	.foliage {
		animation: desert-sway 9s ease-in-out infinite alternate;
		animation-play-state: paused;
		transform-box: fill-box;
		transform-origin: 50% 100%;
	}

	svg.animated .foliage {
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

	@media (prefers-reduced-motion: reduce) {
		.foliage {
			animation: none;
		}
	}
</style>
