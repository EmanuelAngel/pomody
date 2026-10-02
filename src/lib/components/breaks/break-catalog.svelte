<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import Activity from '@lucide/svelte/icons/activity';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Droplet from '@lucide/svelte/icons/droplet';
	import Plus from '@lucide/svelte/icons/plus';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Coffee from '@lucide/svelte/icons/coffee';
	import { Button } from '$lib/components/ui/button';
	import BreakCard from './break-card.svelte';
	import { breaksState as defaultBreaksState, type BreaksState } from '$lib/state/breaks.svelte';
	import type { BreakActivity, BreakCategory } from '$lib/domain/breaks/break-activity.entity';
	import { cn } from '$lib/utils';

	type FilterCategory = 'all' | BreakCategory;

	interface Props {
		breaksState?: BreaksState;
		onNewHabit?: () => void;
		onResetDefaults?: () => void;
		actions?: Snippet<[BreakActivity]>;
		class?: string;
	}

	let {
		breaksState = defaultBreaksState,
		onNewHabit,
		onResetDefaults,
		actions,
		class: className = ''
	}: Props = $props();

	let activeFilter = $state<FilterCategory>('all');

	onMount(() => {
		void breaksState.load();
	});

	const counts = $derived({
		all: breaksState.activities.length,
		physical: breaksState.activities.filter((a) => a.category === 'physical').length,
		mindful: breaksState.activities.filter((a) => a.category === 'mindful').length,
		hydration: breaksState.activities.filter((a) => a.category === 'hydration').length
	});

	const filterOptions = $derived([
		{ id: 'all' as const, label: 'All', count: counts.all },
		{ id: 'physical' as const, label: 'Physical', count: counts.physical, icon: Activity },
		{ id: 'mindful' as const, label: 'Mindful', count: counts.mindful, icon: Sparkles },
		{ id: 'hydration' as const, label: 'Hydration', count: counts.hydration, icon: Droplet }
	]);

	const filteredActivities = $derived(
		activeFilter === 'all'
			? breaksState.activities
			: breaksState.activities.filter((a) => a.category === activeFilter)
	);
</script>

<div data-slot="break-catalog" class={cn('space-y-4', className)}>
	<!-- Control Bar: Filter chips and Action triggers -->
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<!-- Filter Chips -->
		<div
			class="flex flex-wrap items-center gap-1.5"
			role="group"
			aria-label="Filter activities by category"
		>
			{#each filterOptions as filter (filter.id)}
				<button
					type="button"
					aria-pressed={activeFilter === filter.id}
					aria-label={`${filter.label} (${filter.count})`}
					onclick={() => (activeFilter = filter.id)}
					class={cn(
						'inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-150 select-none',
						activeFilter === filter.id
							? 'bg-primary text-primary-foreground shadow-xs'
							: 'border border-border/40 bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground'
					)}
				>
					{#if filter.icon}
						<filter.icon class="size-3 shrink-0 opacity-80" />
					{/if}
					<span>{filter.label}</span>
					<span
						class={cn(
							'inline-flex min-w-[1.125rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold',
							activeFilter === filter.id
								? 'bg-primary-foreground/20 text-primary-foreground'
								: 'bg-muted-foreground/15 text-muted-foreground'
						)}
					>
						{filter.count}
					</span>
				</button>
			{/each}
		</div>

		<!-- Action Triggers -->
		{#if onNewHabit || onResetDefaults}
			<div class="flex items-center gap-1.5 self-end sm:self-auto">
				{#if onResetDefaults}
					<Button
						variant="ghost"
						size="sm"
						onclick={onResetDefaults}
						class="h-7 cursor-pointer gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
					>
						<RotateCcw class="size-3 shrink-0" />
						<span>Reset defaults</span>
					</Button>
				{/if}

				{#if onNewHabit}
					<Button
						size="sm"
						onclick={onNewHabit}
						class="h-7 cursor-pointer gap-1 px-2.5 text-xs font-medium"
					>
						<Plus class="size-3.5 shrink-0" />
						<span>New Habit</span>
					</Button>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Activity Grid or Empty State -->
	{#if breaksState.isLoading && !breaksState.isLoaded}
		<div
			class="flex flex-col items-center justify-center rounded-2xl border border-border/40 bg-muted/10 py-12 text-center"
			role="status"
			aria-live="polite"
		>
			<p class="text-xs font-medium text-muted-foreground">Loading break activities...</p>
		</div>
	{:else if filteredActivities.length > 0}
		<div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
			{#each filteredActivities as activity (activity.id)}
				<BreakCard {activity} {actions} />
			{/each}
		</div>
	{:else}
		<!-- Accessible Empty State -->
		<div
			class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 px-4 py-12 text-center"
			role="status"
			aria-live="polite"
		>
			<div
				class="mb-2.5 flex size-10 items-center justify-center rounded-full bg-muted/60 text-muted-foreground"
			>
				<Coffee class="size-5 opacity-70" />
			</div>
			<p class="text-sm font-medium text-foreground">
				{#if breaksState.activities.length === 0}
					No break activities available
				{:else}
					No {activeFilter} activities found
				{/if}
			</p>
			<p class="mt-1 max-w-xs text-xs text-muted-foreground">
				{#if breaksState.activities.length === 0}
					Reset catalog to default presets or create a custom habit.
				{:else}
					Try selecting another category or add a new {activeFilter} habit.
				{/if}
			</p>
		</div>
	{/if}
</div>
