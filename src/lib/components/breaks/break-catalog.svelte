<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import Activity from '@lucide/svelte/icons/activity';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Droplet from '@lucide/svelte/icons/droplet';
	import Plus from '@lucide/svelte/icons/plus';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Coffee from '@lucide/svelte/icons/coffee';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import BreakCard from './break-card.svelte';
	import BreakFormDialog from './break-form-dialog.svelte';
	import BreakConfirmDialog from './break-confirm-dialog.svelte';
	import { breaksState as defaultBreaksState, type BreaksState } from '$lib/state/breaks.svelte';
	import {
		createBreakActivity,
		type BreakActivity,
		type BreakCategory
	} from '$lib/domain/breaks/break-activity.entity';
	import { cn } from '$lib/utils';

	type FilterCategory = 'all' | BreakCategory;

	interface Props {
		breaksState?: BreaksState;
		showActions?: boolean;
		onNewHabit?: () => void;
		onResetDefaults?: () => void;
		actions?: Snippet<[BreakActivity]>;
		class?: string;
		portalProps?: { disabled?: boolean };
	}

	let {
		breaksState = defaultBreaksState,
		showActions = true,
		onNewHabit,
		onResetDefaults,
		actions,
		class: className = '',
		portalProps
	}: Props = $props();

	let activeFilter = $state<FilterCategory>('all');

	// Dialog states
	let isFormOpen = $state(false);
	let formActivity = $state<BreakActivity | null>(null);

	let isConfirmOpen = $state(false);
	let confirmTitle = $state('');
	let confirmDescription = $state('');
	let confirmLabel = $state('Confirm');
	let confirmVariant = $state<'destructive' | 'default'>('destructive');
	let confirmAction = $state<() => Promise<void> | void>(() => {});

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

	function handleOpenNewHabit() {
		if (onNewHabit) {
			onNewHabit();
			return;
		}
		formActivity = null;
		isFormOpen = true;
	}

	function handleOpenResetDefaults() {
		if (onResetDefaults) {
			onResetDefaults();
			return;
		}
		confirmTitle = 'Reset catalog to defaults?';
		confirmDescription =
			'Reset catalog to defaults? All custom habits will be removed and original 10 presets restored.';
		confirmLabel = 'Reset';
		confirmVariant = 'destructive';
		confirmAction = async () => {
			await breaksState.resetToDefaults();
		};
		isConfirmOpen = true;
	}

	function handleEditHabit(activity: BreakActivity) {
		formActivity = activity;
		isFormOpen = true;
	}

	function handleDeleteHabit(activity: BreakActivity) {
		confirmTitle = 'Delete custom habit?';
		confirmDescription = 'Delete custom habit? This cannot be undone.';
		confirmLabel = 'Delete';
		confirmVariant = 'destructive';
		confirmAction = async () => {
			await breaksState.deleteActivity(activity.id);
		};
		isConfirmOpen = true;
	}

	async function handleSaveHabit(payload: {
		id?: string;
		title: string;
		category: BreakCategory;
		durationMinutes: number;
		guide?: string;
		isPreset: boolean;
	}) {
		const activity = createBreakActivity({
			id: payload.id,
			title: payload.title,
			category: payload.category,
			durationMinutes: payload.durationMinutes,
			guide: payload.guide,
			isPreset: payload.isPreset
		});
		await breaksState.saveActivity(activity);
	}
</script>

<div data-slot="break-catalog" class={cn('flex flex-col gap-4', className)}>
	<!-- Control Bar: Filter chips and Action triggers -->
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<!-- Filter Chips -->
		<div
			class="flex flex-wrap items-center gap-1.5"
			role="group"
			aria-label="Filter activities by category"
		>
			{#each filterOptions as filter (filter.id)}
				<Button
					type="button"
					variant={activeFilter === filter.id ? 'default' : 'outline'}
					size="sm"
					aria-pressed={activeFilter === filter.id}
					aria-label={`${filter.label} (${filter.count})`}
					onclick={() => (activeFilter = filter.id)}
					class={cn(
						'h-7 rounded-full px-2.5 text-xs font-medium select-none',
						activeFilter !== filter.id &&
							'border-border/40 bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground'
					)}
				>
					{#if filter.icon}
						<filter.icon data-icon="inline-start" />
					{/if}
					<span>{filter.label}</span>
					<Badge
						variant={activeFilter === filter.id ? 'secondary' : 'outline'}
						class={cn(
							'h-4 min-w-4 rounded-full px-1 text-[10px] font-semibold',
							activeFilter === filter.id
								? 'border-transparent bg-primary-foreground/20 text-primary-foreground'
								: 'border-transparent bg-muted-foreground/15 text-muted-foreground'
						)}
					>
						{filter.count}
					</Badge>
				</Button>
			{/each}
		</div>

		<!-- Action Triggers -->
		{#if showActions}
			<div class="flex items-center gap-1.5 self-end sm:self-auto">
				<Button
					variant="ghost"
					size="sm"
					onclick={handleOpenResetDefaults}
					class="h-7 cursor-pointer gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
				>
					<RotateCcw data-icon="inline-start" />
					<span>Reset defaults</span>
				</Button>

				<Button
					size="sm"
					onclick={handleOpenNewHabit}
					class="h-7 cursor-pointer gap-1 px-2.5 text-xs font-medium"
				>
					<Plus data-icon="inline-start" />
					<span>New Habit</span>
				</Button>
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
				<BreakCard {activity} {actions} onEdit={handleEditHabit} onDelete={handleDeleteHabit} />
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

	<!-- Form Dialog for Creating & Editing Custom Habits -->
	<BreakFormDialog
		bind:open={isFormOpen}
		activity={formActivity}
		onSave={handleSaveHabit}
		{portalProps}
	/>

	<!-- Confirmation Dialog for Deletions & Catalog Resets -->
	<BreakConfirmDialog
		bind:open={isConfirmOpen}
		title={confirmTitle}
		description={confirmDescription}
		{confirmLabel}
		variant={confirmVariant}
		onConfirm={confirmAction}
		{portalProps}
	/>
</div>
