<script lang="ts">
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import type { PlanningState } from '$lib/state/planning.svelte';

	interface Props {
		planningState: PlanningState;
	}

	let { planningState }: Props = $props();

	let minMinutes = $derived(Math.max(30, planningState.focusMinutes));
</script>

{#if planningState.targetMode === 'end_time' && planningState.projectedPlan.blocks.length === 0}
	<div
		role="alert"
		class="mt-4 flex flex-col gap-2.5 rounded-xl border border-accent-gold/40 bg-accent-gold/10 p-3 text-xs text-accent-gold sm:flex-row sm:items-center sm:justify-between"
	>
		<div class="flex items-center gap-2">
			<AlertCircle class="size-4 shrink-0" />
			<span>Time window is too short for a full focus block.</span>
		</div>
		<button
			type="button"
			onclick={() => planningState.adjustTargetEndTimeToMinimum()}
			class="inline-flex cursor-pointer items-center justify-center rounded-lg border border-accent-gold/50 bg-accent-gold/20 px-2.5 py-1 text-xs font-semibold text-accent-gold transition-colors hover:bg-accent-gold/30 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
		>
			Adjust to minimum (+{minMinutes}m)
		</button>
	</div>
{/if}
