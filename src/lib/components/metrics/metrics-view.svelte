<script lang="ts">
	import ChartColumn from '@lucide/svelte/icons/chart-column';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Clock from '@lucide/svelte/icons/clock';
	import * as Empty from '$lib/components/ui/empty';
	import * as Tabs from '$lib/components/ui/tabs';
	import ActivityTimeline from './activity-timeline.svelte';
	import type { ActivityLogState } from '$lib/state/activity-log.svelte';
	import { Button } from '$lib/components/ui/button';
	import WeeklyBarsChart from './weekly-bars-chart.svelte';
	import HourlyPatternChart from './hourly-pattern-chart.svelte';
	import {
		dailyGoalState as defaultDailyGoalState,
		type DailyGoalState
	} from '$lib/state/daily-goal.svelte';
	import {
		dailyStatsState as defaultDailyStatsState,
		formatDailyDuration,
		type DailyStatsState
	} from '$lib/state/daily-stats.svelte';
	import {
		focusHistoryState as defaultFocusHistoryState,
		type FocusHistoryState
	} from '$lib/state/focus-history.svelte';
	import { localeState, t } from '$lib/state/locale.svelte';
	import {
		navigationState as defaultNavigationState,
		type NavigationState
	} from '$lib/state/navigation.svelte';
	import { addDaysToKey, shiftWeek, weekStartKey } from '$lib/domain/metrics/date-key';
	import {
		hourlyFocusMinutes,
		weekTotal,
		weeklyFocusCompliance,
		weeklyFocusMinutes
	} from '$lib/domain/metrics/focus-aggregations';
	import {
		goalStreak,
		todayGoalProgress,
		weekGoalAttainment
	} from '$lib/domain/metrics/goal-metrics';

	interface Props {
		focusHistoryState?: FocusHistoryState;
		dailyGoalState?: DailyGoalState;
		dailyStatsState?: DailyStatsState;
		navigationState?: NavigationState;
		activityLogState?: ActivityLogState;
	}

	let {
		focusHistoryState = defaultFocusHistoryState,
		dailyGoalState = defaultDailyGoalState,
		dailyStatsState = defaultDailyStatsState,
		navigationState = defaultNavigationState,
		activityLogState
	}: Props = $props();

	const entries = $derived(focusHistoryState.entries);
	const goalHistory = $derived(dailyGoalState.history);
	/** The footer counter's "today": it re-reads the clock when the history changes or the day rolls over. */
	const todayKey = $derived(dailyStatsState.date);

	/** Weeks back from the current one; never positive, the future has nothing to show. */
	let weeksBack = $state(0);
	const selectedWeekStart = $derived(shiftWeek(weekStartKey(todayKey), -weeksBack));

	const days = $derived(weeklyFocusMinutes(entries, selectedWeekStart));
	const total = $derived(weekTotal(days));
	const compliance = $derived(weeklyFocusCompliance(entries, selectedWeekStart));
	const hours = $derived(hourlyFocusMinutes(entries, todayKey));
	const today = $derived(todayGoalProgress(entries, goalHistory, todayKey));
	const attainment = $derived(
		weekGoalAttainment(entries, goalHistory, selectedWeekStart, todayKey)
	);
	const streak = $derived(goalStreak(entries, goalHistory, todayKey));

	/** Floored: a goal at 99.6% must not read as reached. */
	function percent(ratio: number): number {
		return Math.floor(ratio * 100);
	}

	const dateFormatter = $derived(
		new Intl.DateTimeFormat(localeState.current, {
			month: 'short',
			day: 'numeric',
			timeZone: 'UTC'
		})
	);

	function formatKey(dateKey: string): string {
		return dateFormatter.format(new Date(`${dateKey}T00:00:00Z`));
	}

	const weekRange = $derived(
		t.metrics_week_range({
			from: formatKey(selectedWeekStart),
			to: formatKey(addDaysToKey(selectedWeekStart, 6))
		})
	);
</script>

{#snippet statCell(title: string, value: string, detail?: string)}
	<div class="rounded-2xl border border-border/50 bg-card/40 p-4 shadow-xs">
		<span class="block text-[11px] font-medium text-muted-foreground">{title}</span>
		<span class="mt-1 block text-lg font-semibold tracking-tight text-foreground tabular-nums">
			{value}
		</span>
		{#if detail}
			<span class="mt-0.5 block text-[11px] text-muted-foreground">{detail}</span>
		{/if}
	</div>
{/snippet}

<div
	data-slot="metrics-view"
	class="mx-auto flex w-full max-w-5xl flex-col gap-6 px-2 py-4 sm:px-6"
>
	<header class="flex flex-col gap-4 border-b border-border/40 pb-5">
		<div>
			<h2 class="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
				{t.metrics_title()}
			</h2>
			<p class="text-xs text-muted-foreground sm:text-sm">{t.metrics_subtitle()}</p>
		</div>
	</header>

	<Tabs.Root value="stats" class="gap-6">
		<Tabs.List>
			<Tabs.Trigger value="stats">{t.metrics_tab_stats()}</Tabs.Trigger>
			<Tabs.Trigger value="history">{t.metrics_tab_history()}</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="history">
			<ActivityTimeline {activityLogState} />
		</Tabs.Content>

		<Tabs.Content value="stats" class="flex flex-col gap-6">
			{#if !focusHistoryState.isLoaded}
				<div
					class="flex flex-col items-center justify-center rounded-2xl border border-border/40 bg-muted/10 py-12 text-center"
					role="status"
					aria-live="polite"
				>
					<p class="text-xs font-medium text-muted-foreground">{t.metrics_loading()}</p>
				</div>
			{:else if entries.length === 0}
				<Empty.Root class="border border-dashed border-border/60">
					<Empty.Header>
						<Empty.Media variant="icon">
							<ChartColumn />
						</Empty.Media>
						<Empty.Title class="text-base">{t.metrics_empty_title()}</Empty.Title>
						<Empty.Description>{t.metrics_empty_description()}</Empty.Description>
					</Empty.Header>
				</Empty.Root>
			{:else}
				<div
					class="grid grid-cols-2 gap-3 {today === null
						? 'lg:grid-cols-2'
						: 'sm:grid-cols-3 lg:grid-cols-5'} lg:gap-4"
				>
					{@render statCell(
						t.metrics_week_total_title(),
						formatDailyDuration(total.minutes),
						t.metrics_week_total_blocks({ blocks: total.blocks })
					)}
					{@render statCell(
						t.metrics_compliance_title(),
						compliance.ratio === null
							? t.metrics_compliance_none()
							: t.metrics_compliance_value({ percent: percent(compliance.ratio) }),
						compliance.ratio === null
							? t.metrics_compliance_detail_none()
							: t.metrics_compliance_detail({
									completed: compliance.completed,
									started: compliance.started
								})
					)}

					{#if today !== null}
						{#if today.kind === 'active'}
							{@render statCell(
								t.metrics_today_title(),
								t.metrics_today_progress({
									minutes: today.minutes,
									goal: today.goalMinutes,
									percent: percent(today.ratio)
								})
							)}
						{:else}
							{@render statCell(
								t.metrics_today_title(),
								t.metrics_today_rest_day(),
								t.metrics_today_rest_detail()
							)}
						{/if}
						{@render statCell(
							t.metrics_week_goal_title(),
							attainment.ratio === null
								? t.metrics_week_goal_none()
								: t.metrics_week_goal_value({
										met: attainment.metDays,
										evaluated: attainment.evaluatedDays,
										percent: percent(attainment.ratio)
									}),
							attainment.ratio === null ? t.metrics_week_goal_detail_none() : undefined
						)}
						{@render statCell(
							t.metrics_streak_title(),
							streak === 1 ? t.metrics_streak_one() : t.metrics_streak_other({ days: streak })
						)}
					{/if}
				</div>

				{#if today === null}
					<div
						class="flex flex-col gap-3 rounded-2xl border border-border/50 bg-card/40 p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between"
					>
						<div>
							<h3 class="text-sm font-semibold tracking-tight text-foreground">
								{t.metrics_goal_invite_title()}
							</h3>
							<p class="text-xs text-muted-foreground">{t.metrics_goal_invite_description()}</p>
						</div>
						<Button
							variant="outline"
							size="sm"
							class="self-start sm:self-auto"
							onclick={() => navigationState.requestSettings('metrics')}
						>
							{t.metrics_goal_invite_action()}
						</Button>
					</div>
				{/if}

				<div class="grid gap-6 lg:grid-cols-2">
					<section
						aria-labelledby="metrics-weekly-heading"
						class="rounded-2xl border border-border/50 bg-card/40 p-5 shadow-xs"
					>
						<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<div class="flex items-center gap-2.5">
								<div
									class="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary"
								>
									<ChartColumn class="size-4" />
								</div>
								<div>
									<h3
										id="metrics-weekly-heading"
										class="text-sm font-semibold tracking-tight text-foreground sm:text-base"
									>
										{t.metrics_weekly_title()}
									</h3>
									<p class="text-xs text-muted-foreground">{t.metrics_weekly_description()}</p>
								</div>
							</div>
							<div class="flex items-center gap-1">
								<Button
									variant="ghost"
									size="icon-sm"
									aria-label={t.metrics_week_prev()}
									onclick={() => (weeksBack += 1)}
								>
									<ChevronLeft />
								</Button>
								<span class="min-w-28 text-center text-xs text-muted-foreground tabular-nums">
									{weekRange}
								</span>
								<Button
									variant="ghost"
									size="icon-sm"
									aria-label={t.metrics_week_next()}
									disabled={weeksBack === 0}
									onclick={() => (weeksBack -= 1)}
								>
									<ChevronRight />
								</Button>
							</div>
						</div>
						<div class="mt-4">
							<WeeklyBarsChart
								{days}
								{todayKey}
								ariaLabel={t.metrics_weekly_chart_aria({ range: weekRange })}
							/>
						</div>
					</section>

					<section
						aria-labelledby="metrics-hourly-heading"
						class="rounded-2xl border border-border/50 bg-card/40 p-5 shadow-xs"
					>
						<div class="flex items-center gap-2.5">
							<div
								class="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary"
							>
								<Clock class="size-4" />
							</div>
							<div>
								<h3
									id="metrics-hourly-heading"
									class="text-sm font-semibold tracking-tight text-foreground sm:text-base"
								>
									{t.metrics_hourly_title()}
								</h3>
								<p class="text-xs text-muted-foreground">{t.metrics_hourly_description()}</p>
							</div>
						</div>
						<div class="mt-4">
							<HourlyPatternChart {hours} ariaLabel={t.metrics_hourly_chart_aria()} />
						</div>
					</section>
				</div>
			{/if}
		</Tabs.Content>
	</Tabs.Root>
</div>
