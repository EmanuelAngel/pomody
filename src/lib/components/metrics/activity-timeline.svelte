<script lang="ts">
	import type { Component } from 'svelte';
	import CalendarClock from '@lucide/svelte/icons/calendar-clock';
	import CalendarX from '@lucide/svelte/icons/calendar-x';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import Download from '@lucide/svelte/icons/download';
	import History from '@lucide/svelte/icons/history';
	import Link from '@lucide/svelte/icons/link';
	import ListTodo from '@lucide/svelte/icons/list-todo';
	import Pause from '@lucide/svelte/icons/pause';
	import Play from '@lucide/svelte/icons/play';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Settings2 from '@lucide/svelte/icons/settings-2';
	import SkipForward from '@lucide/svelte/icons/skip-forward';
	import SquareCheck from '@lucide/svelte/icons/square-check';
	import Target from '@lucide/svelte/icons/target';
	import Unlink from '@lucide/svelte/icons/unlink';
	import * as Empty from '$lib/components/ui/empty';
	import { Button } from '$lib/components/ui/button';
	import {
		activityTime,
		groupActivityByDay,
		type ActivityKind,
		type ActivityLogEntry
	} from '$lib/domain/activity/activity-log-entry.entity';
	import type { TimerMode } from '$lib/domain/timer/timer-fsm';
	import {
		activityLogState as defaultActivityLogState,
		type ActivityLogState
	} from '$lib/state/activity-log.svelte';
	import { localeState, t } from '$lib/state/locale.svelte';

	interface Props {
		activityLogState?: ActivityLogState;
	}

	let { activityLogState = defaultActivityLogState }: Props = $props();

	const days = $derived(groupActivityByDay(activityLogState.entries));

	const ICONS: Record<ActivityKind, Component> = {
		'block-started': Play,
		'block-paused': Pause,
		'block-resumed': Play,
		'block-completed': CircleCheck,
		'block-skipped': SkipForward,
		'block-abandoned': CircleX,
		'config-changed': Settings2,
		'session-started': CalendarClock,
		'session-ended': CalendarX,
		'session-restored': RotateCcw,
		'task-assigned': Link,
		'task-unassigned': Unlink,
		'task-completed': SquareCheck,
		'plan-modified': ListTodo,
		'daily-goal-changed': Target
	};

	const MODE_LABELS: Record<TimerMode, () => string> = {
		focus: () => t.settings_interval_focus(),
		shortBreak: () => t.settings_interval_short_break(),
		longBreak: () => t.settings_interval_long_break()
	};

	function describe(entry: ActivityLogEntry): string {
		const params = {
			mode: entry.mode ? MODE_LABELS[entry.mode]() : '',
			detail: entry.detail ?? '…'
		};
		const messages: Record<ActivityKind, (p: typeof params) => string> = {
			'block-started': t.activity_block_started,
			'block-paused': t.activity_block_paused,
			'block-resumed': t.activity_block_resumed,
			'block-completed': t.activity_block_completed,
			'block-skipped': t.activity_block_skipped,
			'block-abandoned': t.activity_block_abandoned,
			'config-changed': t.activity_config_changed,
			'session-started': t.activity_session_started,
			'session-ended': t.activity_session_ended,
			'session-restored': t.activity_session_restored,
			'task-assigned': t.activity_task_assigned,
			'task-unassigned': t.activity_task_unassigned,
			'task-completed': t.activity_task_completed,
			'plan-modified': t.activity_plan_modified,
			'daily-goal-changed': t.activity_daily_goal_changed
		};
		return messages[entry.kind](params);
	}

	const dayFormatter = $derived(
		new Intl.DateTimeFormat(localeState.current, {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
			timeZone: 'UTC'
		})
	);

	function exportLog(): void {
		const blob = new Blob([JSON.stringify(activityLogState.entries, null, 2)], {
			type: 'application/json'
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = 'activity-log.json';
		link.click();
		URL.revokeObjectURL(url);
	}
</script>

<section data-slot="activity-timeline" class="flex flex-col gap-6">
	<div class="flex items-center justify-between gap-4">
		<p class="text-xs text-muted-foreground sm:text-sm">{t.activity_description()}</p>
		<Button
			variant="outline"
			size="sm"
			onclick={exportLog}
			disabled={activityLogState.entries.length === 0}
		>
			<Download />
			{t.activity_export()}
		</Button>
	</div>

	{#if activityLogState.loadFailed}
		<p class="py-12 text-center text-xs text-destructive" role="alert">
			{t.activity_load_failed()}
		</p>
	{:else if !activityLogState.isLoaded}
		<p class="py-12 text-center text-xs text-muted-foreground" role="status" aria-live="polite">
			{t.activity_loading()}
		</p>
	{:else if days.length === 0}
		<Empty.Root class="border border-dashed border-border/60">
			<Empty.Header>
				<Empty.Media variant="icon">
					<History />
				</Empty.Media>
				<Empty.Title class="text-base">{t.activity_empty_title()}</Empty.Title>
				<Empty.Description>{t.activity_empty_description()}</Empty.Description>
			</Empty.Header>
		</Empty.Root>
	{:else}
		{#each days as day (day.dateKey)}
			<section class="flex flex-col gap-2" aria-labelledby="activity-day-{day.dateKey}">
				<h3
					id="activity-day-{day.dateKey}"
					class="text-sm font-semibold text-foreground first-letter:uppercase"
				>
					{dayFormatter.format(new Date(`${day.dateKey}T00:00:00Z`))}
				</h3>
				<ol class="flex flex-col border-l border-border/60">
					{#each day.entries as entry, index (`${entry.at}-${index}`)}
						{@const Icon = ICONS[entry.kind]}
						<li class="flex items-center gap-3 py-1.5 pl-4 text-sm">
							<Icon class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
							<span class="flex-1 text-foreground">{describe(entry)}</span>
							<time
								class="text-xs text-muted-foreground tabular-nums"
								datetime={new Date(entry.at).toISOString()}
							>
								{activityTime(entry)}
							</time>
						</li>
					{/each}
				</ol>
			</section>
		{/each}
	{/if}
</section>
