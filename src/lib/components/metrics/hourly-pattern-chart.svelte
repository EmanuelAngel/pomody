<script lang="ts">
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { t } from '$lib/state/locale.svelte';

	interface Props {
		/** Completed focus minutes per local hour, 24 buckets (index = hour). */
		hours: readonly number[];
		ariaLabel: string;
	}

	let { hours, ariaLabel }: Props = $props();

	const WIDTH = 320;
	/** Same box as the weekly chart, so both panels render at the same height. */
	const HEIGHT = 160;
	const PLOT_TOP = 18;
	const PLOT_BOTTOM = 138;
	const BAR_RADIUS = 6;
	const TICK_HOURS = [0, 6, 12, 18];
	const MIN_BAR_HEIGHT = 2;

	const band = WIDTH / 24;
	const barWidth = band * 0.55;
	const peak = $derived(Math.max(...hours));

	/** Rounded on top only: the base sits flat on the axis, as in the weekly chart. */
	function barPath(x: number, y: number, width: number, height: number): string {
		const radius = Math.min(BAR_RADIUS, width / 2, height);
		return `M${x},${y + height}V${y + radius}Q${x},${y} ${x + radius},${y}H${x + width - radius}Q${x + width},${y} ${x + width},${y + radius}V${y + height}Z`;
	}

	const bars = $derived(
		hours.map((minutes, hour) => {
			const height =
				minutes === 0 ? 0 : Math.max(MIN_BAR_HEIGHT, (minutes / peak) * (PLOT_BOTTOM - PLOT_TOP));
			const x = hour * band + (band - barWidth) / 2;
			return {
				hour,
				minutes,
				bandX: hour * band,
				centerX: hour * band + band / 2,
				label: t.metrics_hourly_chart_item({ hour, minutes }),
				path: height === 0 ? null : barPath(x, PLOT_BOTTOM - height, barWidth, height)
			};
		})
	);
</script>

<div class="flex flex-col">
	<Tooltip.Provider delayDuration={0}>
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
				<Tooltip.Root>
					<Tooltip.Trigger>
						{#snippet child({ props })}
							<g {...props} tabindex="-1" data-chart-bar="hourly" class="cursor-default">
								<rect
									x={bar.bandX}
									y="0"
									width={band}
									height={PLOT_BOTTOM}
									class="fill-transparent"
								/>
								{#if bar.path !== null}
									<path d={bar.path} class="fill-accent-iris/70" />
								{/if}
							</g>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content side="top" sideOffset={6}>{bar.label}</Tooltip.Content>
				</Tooltip.Root>
				{#if TICK_HOURS.includes(bar.hour)}
					<text
						x={bar.centerX}
						y={HEIGHT - 6}
						text-anchor="middle"
						class="fill-muted-foreground text-[10px]"
					>
						{bar.hour}
					</text>
				{/if}
			{/each}
		</svg>
	</Tooltip.Provider>

	<ul class="sr-only">
		{#each bars as bar (bar.hour)}
			<li>{bar.label}</li>
		{/each}
	</ul>
</div>
