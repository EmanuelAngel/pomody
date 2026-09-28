<script lang="ts">
	import { untrack } from 'svelte';
	import { cn } from '$lib/utils';
	import { getCycleGrowth, isHarvest } from '$lib/domain/botanical/cycle-growth';
	import { timerState as defaultTimerState, type TimerState } from '$lib/state/timer.svelte';
	import {
		composeScene,
		getPlantModel,
		selectFrameIndex,
		type SceneActivity
	} from './plant-models';

	interface Props {
		timerState?: TimerState;
		class?: string;
	}

	let { timerState = defaultTimerState, class: className }: Props = $props();

	const TICK_MS = 250;
	const HARVEST_TICKS = 16;

	let canvas = $state<HTMLCanvasElement | null>(null);
	let probe = $state<HTMLSpanElement | null>(null);
	let colors = $state<Record<string, string> | null>(null);
	let tick = $state(0);
	let harvestStart = $state<number | null>(null);
	let prefersReducedMotion = $state(false);

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
	const animated = $derived(!timerState.botanicalStatic && !prefersReducedMotion);
	const hiddenInZen = $derived(
		timerState.isRunning && timerState.mode === 'focus' && timerState.botanicalHideInZen
	);
	const harvestAge = $derived(
		harvestStart !== null && tick - harvestStart <= HARVEST_TICKS ? tick - harvestStart : null
	);
	const scene = $derived(
		composeScene(model, { tick, animated, activity, frameIndex, harvestAge }).rows
	);
	const label = $derived(`${model.label}: ${Math.round(growth * 100)}% grown this Pomodoro cycle`);

	const SCENE_WIDTH = 'min(40vh, 26vw)';
	// The timer controls sit this far below the viewport centre; the grass line aligns with them.
	const CONTROLS_OFFSET = '11.75rem';
	const sceneTop = $derived(
		`calc(50vh + ${CONTROLS_OFFSET} - ${SCENE_WIDTH} * ${(model.groundY + 0.5) / model.width})`
	);
	const soilFade = $derived(
		`linear-gradient(to bottom, black ${((model.groundY + 3) / model.height) * 100}%, transparent)`
	);

	$effect(() => {
		const query = window.matchMedia('(prefers-reduced-motion: reduce)');
		prefersReducedMotion = query.matches;
		const onChange = () => (prefersReducedMotion = query.matches);
		query.addEventListener('change', onChange);
		return () => query.removeEventListener('change', onChange);
	});

	$effect(() => {
		if (!animated || hiddenInZen || !timerState.botanicalEnabled) return;
		const id = setInterval(() => {
			if (!document.hidden) tick++;
		}, TICK_MS);
		return () => clearInterval(id);
	});

	let previousGrowth: number | null = null;
	$effect(() => {
		const current = growth;
		if (previousGrowth !== null && isHarvest(previousGrowth, current) && untrack(() => animated)) {
			harvestStart = untrack(() => tick);
		}
		previousGrowth = current;
	});

	/** Canvas cannot read CSS variables, so each ink is resolved through a hidden probe element. */
	function resolveColors(el: HTMLElement, palette: Readonly<Record<string, string>>) {
		const resolved: Record<string, string> = {};
		for (const [ink, value] of Object.entries(palette)) {
			el.style.color = value;
			resolved[ink] = getComputedStyle(el).color;
		}
		return resolved;
	}

	$effect(() => {
		const el = probe;
		const palette = model.palette;
		if (!el) return;
		colors = resolveColors(el, palette);
		const observer = new MutationObserver(() => (colors = resolveColors(el, palette)));
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['data-theme', 'class']
		});
		return () => observer.disconnect();
	});

	$effect(() => {
		const ctx = canvas?.getContext('2d');
		if (!ctx || !colors) return;
		ctx.clearRect(0, 0, model.width, model.height);
		scene.forEach((row, y) => {
			let x = 0;
			while (x < row.length) {
				const ink = row[x];
				let end = x + 1;
				while (end < row.length && row[end] === ink) end++;
				const color = colors![ink];
				if (color) {
					ctx.fillStyle = color;
					ctx.fillRect(x, y, end - x, 1);
				}
				x = end;
			}
		});
	});
</script>

{#if timerState.botanicalEnabled}
	<div
		data-frame={frameIndex}
		data-activity={activity}
		data-animated={animated}
		data-harvesting={harvestAge !== null}
		aria-hidden={hiddenInZen}
		style:top={sceneTop}
		class={cn(
			'pointer-events-none transition-opacity duration-300 ease-out select-none motion-reduce:transition-none',
			hiddenInZen ? 'opacity-0' : 'opacity-100',
			className
		)}
	>
		<span bind:this={probe} class="hidden" aria-hidden="true"></span>
		<div role="img" aria-label={label}>
			<canvas
				bind:this={canvas}
				aria-hidden="true"
				width={model.width}
				height={model.height}
				class="block h-auto [image-rendering:pixelated]"
				style:width={SCENE_WIDTH}
				style:mask-image={soilFade}
			></canvas>
		</div>
	</div>
{/if}
