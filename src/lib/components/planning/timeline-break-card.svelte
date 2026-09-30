<script lang="ts">
	import Coffee from '@lucide/svelte/icons/coffee';
	import Clock from '@lucide/svelte/icons/clock';
	import Check from '@lucide/svelte/icons/check';
	import { cn } from '$lib/utils';
	import type { PlanBlock } from '$lib/domain/planning/session-plan.entity';

	interface Props {
		block: PlanBlock;
		class?: string;
	}

	let { block, class: className = '' }: Props = $props();
</script>

<div class={cn('group relative', className)}>
	<!-- Left Circular Badge -->
	<div
		class={cn(
			'absolute top-2.5 -left-6 flex size-5.5 items-center justify-center rounded-full border shadow-xs',
			block.status === 'in_progress'
				? 'border-primary/50 bg-primary/20 text-primary'
				: block.status === 'completed'
					? 'border-accent-pine/50 bg-accent-pine/15 text-accent-pine'
					: block.status === 'skipped'
						? 'border-border/40 bg-muted/50 text-muted-foreground/50'
						: 'border-border/60 bg-muted text-muted-foreground'
		)}
	>
		{#if block.status === 'completed'}
			<Check class="size-2.5 stroke-[3]" />
		{:else if block.mode === 'shortBreak'}
			<Coffee class="size-3" />
		{:else}
			<Clock class="size-3" />
		{/if}
	</div>

	<!-- Break Card Body -->
	<div
		class={cn(
			'rounded-xl border p-2.5 transition-colors',
			block.status === 'in_progress'
				? 'border-primary/40 bg-primary/5'
				: block.status === 'skipped'
					? 'border-border/30 bg-muted/20 opacity-70'
					: 'border-border/30 bg-muted/20'
		)}
	>
		<div class="flex items-center justify-between gap-2">
			<div class="flex items-center gap-2">
				<span class="text-xs font-medium text-foreground">
					{block.mode === 'shortBreak' ? 'Short Break' : 'Long Break'}
				</span>
				<span
					class="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
				>
					{Math.round(block.durationSeconds / 60)}m
				</span>
			</div>
			{#if block.status === 'in_progress'}
				<span class="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
					Active break
				</span>
			{:else if block.status === 'completed'}
				<span
					class="inline-flex items-center gap-1 rounded-full bg-accent-pine/10 px-2 py-0.5 text-[10px] font-medium text-accent-pine"
				>
					<Check class="size-2.5 stroke-[2.5]" />
					<span>Completed</span>
				</span>
			{:else if block.status === 'skipped'}
				<span
					class="rounded-full bg-muted/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground line-through"
				>
					Skipped
				</span>
			{:else}
				<span class="text-[11px] text-muted-foreground/60">Upcoming</span>
			{/if}
		</div>
	</div>
</div>
