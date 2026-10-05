<script lang="ts">
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import type { PlanningState } from '$lib/state/planning.svelte';
	import type { TimerState } from '$lib/state/timer.svelte';
	import { t } from '$lib/state/locale.svelte';

	interface Props {
		planningState: PlanningState;
		timerState?: TimerState;
		open?: boolean;
	}

	let { planningState, timerState, open = $bindable(false) }: Props = $props();
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Trigger
		class="cursor-pointer rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/20 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
	>
		{t.planning_dialog_end_session_trigger()}
	</AlertDialog.Trigger>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{t.planning_dialog_end_session_title()}</AlertDialog.Title>
			<AlertDialog.Description>
				{t.planning_dialog_end_session_description()}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>{t.planning_dialog_cancel()}</AlertDialog.Cancel>
			<AlertDialog.Action
				variant="destructive"
				onclick={() => planningState.endSession(timerState)}
			>
				{t.planning_dialog_end_session_confirm()}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
