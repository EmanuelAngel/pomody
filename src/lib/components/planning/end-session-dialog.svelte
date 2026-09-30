<script lang="ts">
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import type { PlanningState } from '$lib/state/planning.svelte';
	import type { TimerState } from '$lib/state/timer.svelte';

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
		End Session Plan
	</AlertDialog.Trigger>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>End Active Session?</AlertDialog.Title>
			<AlertDialog.Description>
				This will cancel your ongoing session plan, clear block progression, and reset the active
				timer.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action
				variant="destructive"
				onclick={() => planningState.endSession(timerState)}
			>
				End Session
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
