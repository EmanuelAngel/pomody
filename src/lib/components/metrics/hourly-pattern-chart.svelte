<script lang="ts">
	import { t } from '$lib/state/locale.svelte';

	interface Props {
		/** Completed focus minutes per local hour, 24 buckets (index = hour). */
		hours: readonly number[];
		ariaLabel: string;
	}

	let { hours, ariaLabel }: Props = $props();

	const WIDTH = 320;
	const HEIGHT = 80;
	const PLOT_TOP = 4;
	const PLOT_BOTTOM = 62;
	const TICK_HOURS = [0, 6, 12, 18];
	const MIN_BAR_HEIGHT = 2;

	const band = WIDTH / 24;
	const barWidth = band * 0.55;
	const peak = $derived(Math.max(...hours));

	const bars = $derived(
		hours.map((minutes, hour) => {
			const height =
				minutes === 0 ? 0 : Math.max(MIN_BAR_HEIGHT, (minutes / peak) * (PLOT_BOTTOM - PLOT_TOP));
			return {
				hour,
				minutes,
				x: hour * band + (band - barWidth) / 2,
				y: PLOT_BOTTOM - height,
				height
			};
		})
	);
</script>

<div class="flex flex-col">
	<svg
		role="img"
		aria-label={ariaLabel}
		viewBox="0 0 {WIDTH} {HEIGHT}"
		class="h-auto w-full overflow-visible"
	>
		<line
			x1="0"
			x2={WIDTH}
			y1={PLOT_BOTTOM}
			y2={PLOT_BOTTOM}
			class="stroke-border"
			stroke-width="1"
		/>
		{#each bars as bar (bar.hour)}
			<rect
				data-chart-bar="hourly"
				x={bar.x}
				y={bar.y}
				width={barWidth}
				height={bar.height}
				rx="1.5"
				class={bar.minutes === 0 ? 'fill-transparent' : 'fill-accent-iris'}
			/>
		{/each}
		{#each TICK_HOURS as hour (hour)}
			<text
				x={hour * band + band / 2}
				y={HEIGHT - 6}
				text-anchor="middle"
				class="fill-muted-foreground text-[10px]"
			>
				{hour}
			</text>
		{/each}
	</svg>

	<ul class="sr-only">
		{#each bars as bar (bar.hour)}
			<li>{t.metrics_hourly_chart_item({ hour: bar.hour, minutes: bar.minutes })}</li>
		{/each}
	</ul>
</div>
