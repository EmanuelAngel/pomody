<script lang="ts">
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { t } from '$lib/state/locale.svelte';
	import { formatDailyDuration } from '$lib/state/daily-stats.svelte';
	import type { DayFocus } from '$lib/domain/metrics/focus-aggregations';

	interface Props {
		/** The seven days of the week, Monday to Sunday. */
		days: readonly DayFocus[];
		todayKey: string;
		ariaLabel: string;
	}

	let { days, todayKey, ariaLabel }: Props = $props();

	const WIDTH = 320;
	const HEIGHT = 160;
	const PLOT_TOP = 18;
	const PLOT_BOTTOM = 138;
	const BAR_WIDTH = 28;
	const BAR_RADIUS = 6;
	const MIN_BAR_HEIGHT = 2;
	const GRID_STEPS = [0, 0.5, 1];

	/** The axis tops out at a whole hour, never below one, so a quiet week does not look full. */
	const axisMax = $derived(
		Math.max(60, Math.ceil(Math.max(...days.map((day) => day.minutes)) / 60) * 60)
	);

	const band = WIDTH / 7;

	/** Rounded on top only: the base sits flat on the axis, as in the shadcn bar charts. */
	function barPath(x: number, y: number, width: number, height: number): string {
		const radius = Math.min(BAR_RADIUS, width / 2, height);
		return `M${x},${y + height}V${y + radius}Q${x},${y} ${x + radius},${y}H${x + width - radius}Q${x + width},${y} ${x + width},${y + radius}V${y + height}Z`;
	}

	/** `$derived` is load-bearing: `t` tracks the locale on property access. */
	const dayNames = $derived([
		t.settings_metrics_weekday_1_short(),
		t.settings_metrics_weekday_2_short(),
		t.settings_metrics_weekday_3_short(),
		t.settings_metrics_weekday_4_short(),
		t.settings_metrics_weekday_5_short(),
		t.settings_metrics_weekday_6_short(),
		t.settings_metrics_weekday_7_short()
	]);

	const bars = $derived(
		days.map((day, index) => {
			const plotHeight = PLOT_BOTTOM - PLOT_TOP;
			const height =
				day.minutes === 0 ? 0 : Math.max(MIN_BAR_HEIGHT, (day.minutes / axisMax) * plotHeight);
			const x = index * band + (band - BAR_WIDTH) / 2;
			return {
				dateKey: day.dateKey,
				isToday: day.dateKey === todayKey,
				label: t.metrics_weekly_chart_item({
					day: dayNames[index],
					duration: formatDailyDuration(day.minutes)
				}),
				name: dayNames[index],
				bandX: index * band,
				centerX: index * band + band / 2,
				path: height === 0 ? null : barPath(x, PLOT_BOTTOM - height, BAR_WIDTH, height)
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
			{#each GRID_STEPS as step (step)}
				{@const y = PLOT_BOTTOM - step * (PLOT_BOTTOM - PLOT_TOP)}
				<line
					x1="0"
					x2={WIDTH}
					y1={y}
					y2={y}
					class="stroke-border"
					stroke-width="1"
					stroke-dasharray={step === 0 ? undefined : '3 3'}
				/>
			{/each}
			<text x="0" y={PLOT_TOP - 6} class="fill-muted-foreground text-[9px]">
				{formatDailyDuration(axisMax)}
			</text>

			{#each bars as bar (bar.dateKey)}
				<Tooltip.Root>
					<Tooltip.Trigger>
						{#snippet child({ props })}
							<g
								{...props}
								data-chart-bar="weekly"
								data-today={bar.isToday ? 'true' : undefined}
								class="cursor-default"
							>
								<rect
									x={bar.bandX}
									y="0"
									width={band}
									height={PLOT_BOTTOM}
									class="fill-transparent"
								/>
								{#if bar.path !== null}
									<path d={bar.path} class={bar.isToday ? 'fill-primary' : 'fill-primary/40'} />
								{/if}
							</g>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content side="top" sideOffset={6}>{bar.label}</Tooltip.Content>
				</Tooltip.Root>
				<text
					x={bar.centerX}
					y={HEIGHT - 6}
					text-anchor="middle"
					class={bar.isToday
						? 'fill-foreground text-[10px] font-semibold'
						: 'fill-muted-foreground text-[10px]'}
				>
					{bar.name}
				</text>
			{/each}
		</svg>
	</Tooltip.Provider>

	<ul class="sr-only">
		{#each bars as bar (bar.dateKey)}
			<li>{bar.label}</li>
		{/each}
	</ul>
</div>
