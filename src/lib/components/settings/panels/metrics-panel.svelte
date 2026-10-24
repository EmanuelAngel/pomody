<script lang="ts">
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as Field from '$lib/components/ui/field';
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Separator } from '$lib/components/ui/separator';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	import {
		dailyGoalState as defaultDailyGoalState,
		type DailyGoalState
	} from '$lib/state/daily-goal.svelte';
	import {
		focusHistoryState as defaultFocusHistoryState,
		type FocusHistoryState
	} from '$lib/state/focus-history.svelte';
	import { t } from '$lib/state/locale.svelte';
	import { MAX_DAILY_GOAL_MINUTES, MAX_REST_WEEKDAYS } from '$lib/domain/goals/daily-goal.entity';

	interface Props {
		dailyGoalState?: DailyGoalState;
		focusHistoryState?: FocusHistoryState;
	}

	let {
		dailyGoalState = defaultDailyGoalState,
		focusHistoryState = defaultFocusHistoryState
	}: Props = $props();

	const goal = $derived(dailyGoalState.currentGoal);
	const goalMinutes = $derived(goal === null ? null : goal.minutes);

	/** What the field shows while the user types; the goal only changes when the edit is committed. */
	let draft = $state('');
	let draftInvalid = $state(false);
	let deleteOpen = $state(false);

	// The field follows the stored goal: first load, another tab, or a committed edit.
	$effect(() => {
		draft = goalMinutes === null ? '' : String(goalMinutes);
		draftInvalid = false;
	});

	async function commitGoal() {
		const raw = draft.trim();

		if (raw === '') {
			// Nothing typed is only a mistake when it would have replaced a goal.
			draftInvalid = goalMinutes !== null;
			return;
		}

		const minutes = Number(raw);
		const unchanged = minutes === goalMinutes || (minutes === 0 && goalMinutes === null);
		if (unchanged) {
			draftInvalid = false;
			return;
		}

		const result = await dailyGoalState.setGoal(minutes, goal?.restWeekdays ?? []);
		draftInvalid = !result.ok;
	}

	/** Controlled by the stored goal: a rejected toggle simply never reaches the state. */
	const restValues = $derived((goal?.restWeekdays ?? []).map(String));

	function handleRestChange(next: string[]) {
		if (goal === null || next.length > MAX_REST_WEEKDAYS) {
			return;
		}

		void dailyGoalState.setGoal(goal.minutes, next.map(Number));
	}

	async function handleDeleteHistory() {
		await focusHistoryState.clear();
	}

	/** Monday first, matching the ISO weekday numbers the goal stores. */
	const weekdays = $derived([
		{
			value: '1',
			short: t.settings_metrics_weekday_1_short(),
			long: t.settings_metrics_weekday_1_long()
		},
		{
			value: '2',
			short: t.settings_metrics_weekday_2_short(),
			long: t.settings_metrics_weekday_2_long()
		},
		{
			value: '3',
			short: t.settings_metrics_weekday_3_short(),
			long: t.settings_metrics_weekday_3_long()
		},
		{
			value: '4',
			short: t.settings_metrics_weekday_4_short(),
			long: t.settings_metrics_weekday_4_long()
		},
		{
			value: '5',
			short: t.settings_metrics_weekday_5_short(),
			long: t.settings_metrics_weekday_5_long()
		},
		{
			value: '6',
			short: t.settings_metrics_weekday_6_short(),
			long: t.settings_metrics_weekday_6_long()
		},
		{
			value: '7',
			short: t.settings_metrics_weekday_7_short(),
			long: t.settings_metrics_weekday_7_long()
		}
	]);
</script>

<div class="flex flex-col gap-6">
	<p class="text-xs text-muted-foreground">{t.settings_section_metrics_description()}</p>

	<Field.Group class="flex flex-col gap-5">
		<!-- Daily goal -->
		<Field.Field class="gap-2.5" data-invalid={draftInvalid || undefined}>
			<Field.Label for="metrics-daily-goal" class="text-xs font-medium text-foreground">
				{t.settings_metrics_goal_label()}
			</Field.Label>
			<div class="flex items-center gap-2">
				<Input
					id="metrics-daily-goal"
					type="number"
					inputmode="numeric"
					min={0}
					max={MAX_DAILY_GOAL_MINUTES}
					step={1}
					value={draft}
					aria-label={t.settings_metrics_goal_aria()}
					aria-invalid={draftInvalid}
					oninput={(event) => {
						draft = event.currentTarget.value;
						draftInvalid = false;
					}}
					onchange={commitGoal}
					class="w-28 font-mono"
				/>
				<span class="text-xs text-muted-foreground">{t.settings_metrics_goal_unit()}</span>
			</div>
			{#if draftInvalid}
				<Field.Error>{t.settings_metrics_goal_invalid({ max: MAX_DAILY_GOAL_MINUTES })}</Field.Error
				>
			{:else}
				<Field.Description>{t.settings_metrics_goal_description()}</Field.Description>
			{/if}
		</Field.Field>

		<!-- Rest days -->
		<Field.Set class="gap-2.5">
			<Field.Legend variant="label" class="mb-0 text-xs text-foreground">
				{t.settings_metrics_rest_label()}
			</Field.Legend>
			<ToggleGroup.Root
				type="multiple"
				variant="outline"
				size="sm"
				disabled={goal === null}
				aria-label={t.settings_metrics_rest_aria()}
				bind:value={() => restValues, handleRestChange}
			>
				{#each weekdays as weekday (weekday.value)}
					<ToggleGroup.Item value={weekday.value} aria-label={weekday.long} class="text-xs">
						{weekday.short}
					</ToggleGroup.Item>
				{/each}
			</ToggleGroup.Root>
			<Field.Description>
				{goal === null
					? t.settings_metrics_rest_needs_goal()
					: t.settings_metrics_rest_description()}
			</Field.Description>
		</Field.Set>
	</Field.Group>

	<Separator />

	<!-- History -->
	<div class="flex flex-col gap-3">
		<div>
			<h3 class="text-sm font-semibold tracking-wide text-foreground">
				{t.settings_metrics_history_label()}
			</h3>
			<p class="mt-0.5 text-xs text-muted-foreground">
				{t.settings_metrics_history_description()}
			</p>
		</div>

		<AlertDialog.Root bind:open={deleteOpen}>
			<AlertDialog.Trigger>
				{#snippet child({ props })}
					<Button {...props} variant="destructive" size="sm" class="w-fit">
						<Trash2 data-icon="inline-start" />
						{t.settings_metrics_delete_history()}
					</Button>
				{/snippet}
			</AlertDialog.Trigger>
			<AlertDialog.Content>
				<AlertDialog.Header>
					<AlertDialog.Title>{t.settings_metrics_delete_title()}</AlertDialog.Title>
					<AlertDialog.Description>
						{t.settings_metrics_delete_description()}
					</AlertDialog.Description>
				</AlertDialog.Header>
				<AlertDialog.Footer>
					<AlertDialog.Cancel>{t.settings_metrics_delete_cancel()}</AlertDialog.Cancel>
					<AlertDialog.Action variant="destructive" onclick={handleDeleteHistory}>
						{t.settings_metrics_delete_confirm()}
					</AlertDialog.Action>
				</AlertDialog.Footer>
			</AlertDialog.Content>
		</AlertDialog.Root>
	</div>
</div>
