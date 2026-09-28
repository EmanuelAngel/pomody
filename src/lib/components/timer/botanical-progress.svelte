<script lang="ts">
	import { cn } from '$lib/utils';
	import { getCycleGrowth, isHarvest } from '$lib/domain/botanical/cycle-growth';
	import { timerState as defaultTimerState, type TimerState } from '$lib/state/timer.svelte';
	import { getPlantModel, selectFrameIndex, toPixelRuns } from './plant-models';

	interface Props {
		timerState?: TimerState;
		class?: string;
	}

	let { timerState = defaultTimerState, class: className }: Props = $props();

	const model = $derived(getPlantModel(timerState.botanicalModel));
	const growth = $derived(
		getCycleGrowth({
			mode: timerState.mode,
			currentRound: timerState.currentRound,
			progress: timerState.progress,
			roundsBeforeLongBreak: timerState.roundsBeforeLongBreak
		})
	);
	const frameIndex = $derived(selectFrameIndex(model.frames.length, growth));
	const runs = $derived(toPixelRuns(model.frames[frameIndex], model.palette));
	const animated = $derived(!timerState.botanicalStatic);
	const hiddenInZen = $derived(timerState.isRunning && timerState.botanicalHideInZen);
	const percent = $derived(Math.round(growth * 100));
	const label = $derived(`${model.label}: ${percent}% grown this Pomodoro cycle`);

	let harvestCount = $state(0);
	let previousGrowth: number | null = null;

	$effect(() => {
		const current = growth;
		if (previousGrowth !== null && animated && isHarvest(previousGrowth, current)) {
			harvestCount++;
		}
		previousGrowth = current;
	});

	function glintDelay(x: number, y: number): string {
		return `${-(((x * 7 + y * 13) % 17) * 0.35).toFixed(2)}s`;
	}
</script>

{#if timerState.botanicalEnabled}
	<div
		data-frame={frameIndex}
		data-animated={animated}
		aria-hidden={hiddenInZen}
		class={cn(
			'botanical pointer-events-none transition-opacity duration-300 ease-out select-none motion-reduce:transition-none',
			hiddenInZen ? 'is-paused opacity-0' : timerState.isRunning ? 'opacity-60' : 'opacity-100',
			className
		)}
	>
		<svg
			role="img"
			aria-label={label}
			viewBox="0 0 {model.width} {model.height}"
			shape-rendering="crispEdges"
			class="h-auto w-24 xl:w-32"
		>
			{#each runs as run (`${run.x}-${run.y}`)}
				<rect
					x={run.x}
					y={run.y}
					width={run.width}
					height="1"
					class={animated && run.idle ? `idle-${run.idle}` : undefined}
					style:fill={run.fill}
					style:animation-delay={animated && run.idle === 'glint'
						? glintDelay(run.x, run.y)
						: undefined}
				/>
			{/each}

			{#if animated && model.particle}
				<rect
					class="idle-particle"
					x={model.particle.origin.x}
					y={model.particle.origin.y}
					width="1"
					height="1"
					style:fill={model.particle.fill}
				/>
			{/if}

			{#if animated && model.harvest}
				{#key harvestCount}
					{#if harvestCount > 0}
						<rect
							class="harvest-drop"
							data-testid="harvest-drop"
							x={model.harvest.from.x}
							y={model.harvest.from.y}
							width="2"
							height="2"
							style:fill={model.harvest.fill}
							style:--drop-x="{model.harvest.to.x - model.harvest.from.x}px"
							style:--drop-y="{model.harvest.to.y - model.harvest.from.y}px"
						/>
					{/if}
				{/key}
			{/if}
		</svg>
	</div>
{/if}

<style>
	.idle-sway-a {
		animation: sway-a 1.8s steps(1, end) infinite;
	}
	.idle-sway-b {
		animation: sway-b 1.8s steps(1, end) infinite;
	}
	.idle-glint {
		animation: glint 6s steps(1, end) infinite;
	}
	.idle-particle {
		opacity: 0;
		animation: drift 11s steps(1, end) infinite;
	}
	.harvest-drop {
		animation: harvest 1.4s steps(9, end) forwards;
	}
	.is-paused :global(rect) {
		animation-play-state: paused;
	}

	@keyframes sway-a {
		0% {
			opacity: 1;
		}
		50% {
			opacity: 0;
		}
	}
	@keyframes sway-b {
		0% {
			opacity: 0;
		}
		50% {
			opacity: 1;
		}
	}
	@keyframes glint {
		0% {
			fill: var(--accent-foam);
		}
		84% {
			fill: var(--accent-pine);
		}
	}
	@keyframes drift {
		0% {
			opacity: 0;
			transform: translate(0, 0);
		}
		8% {
			opacity: 0.9;
			transform: translate(1px, -1px);
		}
		14% {
			transform: translate(1px, -3px);
		}
		20% {
			transform: translate(3px, -4px);
		}
		26% {
			transform: translate(3px, -6px);
		}
		32% {
			opacity: 0.6;
			transform: translate(5px, -7px);
		}
		38% {
			opacity: 0;
			transform: translate(5px, -9px);
		}
	}
	@keyframes harvest {
		0% {
			transform: translate(0, 0);
			opacity: 1;
		}
		80% {
			transform: translate(var(--drop-x), var(--drop-y));
			opacity: 1;
		}
		100% {
			transform: translate(var(--drop-x), var(--drop-y));
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		rect {
			animation: none !important;
		}
	}
</style>
