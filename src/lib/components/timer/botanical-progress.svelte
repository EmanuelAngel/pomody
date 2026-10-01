<script lang="ts">
	import { untrack } from 'svelte';
	import { MediaQuery, createSubscriber } from 'svelte/reactivity';
	import { cn } from '$lib/utils';
	import { getCycleGrowth, isHarvest } from '$lib/domain/botanical/cycle-growth';
	import { timerState as defaultTimerState, type TimerState } from '$lib/state/timer.svelte';
	import {
		composeScene,
		getPlantModel,
		selectFrameIndex,
		toInkPaths,
		type SceneActivity
	} from './plant-models';

	interface Props {
		timerState?: TimerState;
		class?: string;
	}

	let { timerState = defaultTimerState, class: className }: Props = $props();

	const TICK_MS = 250;
	const HARVEST_TICKS = 16;

	/** Animation clock that only runs while something reads `running` (the visible, animated scene). */
	class SceneClock {
		#tick = 0;
		#subscribe = createSubscriber((update) => {
			const id = setInterval(() => {
				if (document.hidden) return;
				this.#tick++;
				update();
			}, TICK_MS);
			return () => clearInterval(id);
		});

		get running(): number {
			this.#subscribe();
			return this.#tick;
		}

		get frozen(): number {
			return this.#tick;
		}
	}

	const clock = new SceneClock();
	const reducedMotion = new MediaQuery('prefers-reduced-motion: reduce');
	// Growth history lives in plain closure variables: only `growth` drives the derived below.
	let previousGrowth: number | null = null;
	let lastHarvest: number | null = null;

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
	const activity: SceneActivity = $derived(
		timerState.isRunning && timerState.mode !== 'focus' ? 'break' : 'calm'
	);
	const animated = $derived(!timerState.botanicalStatic && !reducedMotion.current);
	const hiddenInZen = $derived(
		timerState.isRunning && timerState.mode === 'focus' && timerState.botanicalHideInZen
	);
	const tick = $derived(animated && !hiddenInZen ? clock.running : clock.frozen);
	/** Tick at which the latest cycle restarted from full maturity (the harvest moment). */
	const harvestStart = $derived.by(() => {
		const current = growth;
		if (previousGrowth !== null && isHarvest(previousGrowth, current) && untrack(() => animated)) {
			lastHarvest = untrack(() => clock.frozen);
		}
		previousGrowth = current;
		return lastHarvest;
	});
	const harvestAge = $derived(
		harvestStart !== null && tick - harvestStart <= HARVEST_TICKS ? tick - harvestStart : null
	);
	const scene = $derived(
		composeScene(model, { tick, animated, activity, frameIndex, harvestAge }).rows
	);
	const paths = $derived(toInkPaths(scene, model.palette));
	const label = $derived(`${model.label}: ${Math.round(growth * 100)}% grown this Pomodoro cycle`);

	// The timer controls sit this far below the viewport centre; the grass line aligns with them.
	const CONTROLS_OFFSET = '11.75rem';
	// Half the timer column (max-w-md): the free space on the left ends here.
	const TIMER_HALF = '14rem';
	const CANOPY_CLEARANCE = '4rem';
	const ISLAND_CLEARANCE = '1.5rem';
	const GUTTER_GAP = '2rem';

	/** Rows the fully grown plant rises above the grass; the scene is sized so it always fits. */
	const matureRows = $derived.by(() => {
		const last = composeScene(model, {
			tick: 0,
			animated: false,
			activity: 'calm',
			frameIndex: model.frames.length - 1,
			harvestAge: null
		}).rows;
		const top = last.findIndex((row, y) => y < model.groundY && /[^.]/.test(row));
		return model.groundY - Math.max(0, top);
	});
	/** The scene is as wide as the free space allows, as long as the canopy and the island tip stay on screen. */
	const sceneWidth = $derived(
		`min(50vw - ${TIMER_HALF} - ${GUTTER_GAP}, (50vh + ${CONTROLS_OFFSET} - ${CANOPY_CLEARANCE}) * ${model.width / (matureRows + 0.5)}, (50vh - ${CONTROLS_OFFSET} - ${ISLAND_CLEARANCE}) * ${model.width / (model.height - model.groundY - 0.5)})`
	);
	const sceneLeft = `max(0px, (50vw - ${TIMER_HALF} - var(--scene-w)) / 2)`;
	const sceneTop = $derived(
		`calc(50vh + ${CONTROLS_OFFSET} - var(--scene-w) * ${(model.groundY + 0.5) / model.width})`
	);
</script>

{#if timerState.botanicalEnabled}
	<div
		data-frame={frameIndex}
		data-activity={activity}
		data-animated={animated}
		data-harvesting={harvestAge !== null}
		aria-hidden={hiddenInZen}
		style:--scene-w={sceneWidth}
		style:left={sceneLeft}
		style:top={sceneTop}
		class={cn(
			'pointer-events-none transition-opacity duration-300 ease-out select-none motion-reduce:transition-none',
			hiddenInZen ? 'opacity-0' : 'opacity-100',
			className
		)}
	>
		<!-- one viewBox unit = one art pixel; crispEdges keeps the pixel art sharp when scaled -->
		<svg
			role="img"
			aria-label={label}
			viewBox="0 0 {model.width} {model.height}"
			shape-rendering="crispEdges"
			class="block h-auto"
			style:width="var(--scene-w)"
		>
			{#each paths as path (path.ink)}
				<path d={path.d} style:fill={model.palette[path.ink]} />
			{/each}
		</svg>
	</div>
{/if}
