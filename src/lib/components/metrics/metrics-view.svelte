<script lang="ts">
	import ChartColumn from '@lucide/svelte/icons/chart-column';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import * as Card from '$lib/components/ui/card';
	import * as Empty from '$lib/components/ui/empty';
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
	}

	let {
		focusHistoryState = defaultFocusHistoryState,
		dailyGoalState = defaultDailyGoalState,
		dailyStatsState = defaultDailyStatsState,
		navigationState = defaultNavigationState
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

{#snippet statCard(title: string, value: string, detail?: string)}
	<Card.Root size="sm">
		<Card.Header>
			<Card.Description>{title}</Card.Description>
			<Card.Title class="text-2xl tabular-nums">{value}</Card.Title>
		</Card.Header>
		{#if detail}
			<Card.Content class="text-xs text-muted-foreground">{detail}</Card.Content>
		{/if}
	</Card.Root>
{/snippet}

<div data-slot="metrics-view" class="flex w-full max-w-2xl flex-col gap-6 self-center">
	<h2 class="text-lg font-semibold tracking-tight text-foreground">{t.metrics_title()}</h2>

	{#if entries.length === 0}
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
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
			{@render statCard(
				t.metrics_week_total_title(),
				formatDailyDuration(total.minutes),
				t.metrics_week_total_blocks({ blocks: total.blocks })
			)}
			{@render statCard(
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

			{#if today === null}
				<Card.Root size="sm" class="col-span-full sm:col-span-1">
					<Card.Header>
						<Card.Title>{t.metrics_goal_invite_title()}</Card.Title>
						<Card.Description>{t.metrics_goal_invite_description()}</Card.Description>
					</Card.Header>
					<Card.Footer>
						<Button
							variant="outline"
							size="sm"
							onclick={() => navigationState.requestSettings('metrics')}
						>
							{t.metrics_goal_invite_action()}
						</Button>
					</Card.Footer>
				</Card.Root>
			{:else}
				{#if today.kind === 'active'}
					{@render statCard(
						t.metrics_today_title(),
						t.metrics_today_progress({
							minutes: today.minutes,
							goal: today.goalMinutes,
							percent: percent(today.ratio)
						})
					)}
				{:else}
					{@render statCard(
						t.metrics_today_title(),
						t.metrics_today_rest_day(),
						t.metrics_today_rest_detail()
					)}
				{/if}
				{@render statCard(
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
				{@render statCard(
					t.metrics_streak_title(),
					streak === 1 ? t.metrics_streak_one() : t.metrics_streak_other({ days: streak })
				)}
			{/if}
		</div>

		<Card.Root>
			<Card.Header>
				<Card.Title>{t.metrics_weekly_title()}</Card.Title>
				<Card.Description>{t.metrics_weekly_description()}</Card.Description>
				<Card.Action class="flex items-center gap-1">
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
				</Card.Action>
			</Card.Header>
			<Card.Content>
				<WeeklyBarsChart
					{days}
					{todayKey}
					ariaLabel={t.metrics_weekly_chart_aria({ range: weekRange })}
				/>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>{t.metrics_hourly_title()}</Card.Title>
				<Card.Description>{t.metrics_hourly_description()}</Card.Description>
			</Card.Header>
			<Card.Content>
				<HourlyPatternChart {hours} ariaLabel={t.metrics_hourly_chart_aria()} />
			</Card.Content>
		</Card.Root>
	{/if}
</div>
