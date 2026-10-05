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
	import { getLocalizedBreakCategory } from './break-preset-i18n';
	import { breaksState as defaultBreaksState, type BreaksState } from '$lib/state/breaks.svelte';
	import { t } from '$lib/state/locale.svelte';
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
	let confirmType = $state<'reset' | 'delete' | null>(null);
	let confirmVariant = $state<'destructive' | 'default'>('destructive');
	let confirmAction = $state<() => Promise<void> | void>(() => {});

	const confirmTitle = $derived.by(() => {
		if (confirmType === 'reset') return t.break_catalog_confirm_reset_title();
		if (confirmType === 'delete') return t.break_catalog_confirm_delete_title();
		return '';
	});

	const confirmDescription = $derived.by(() => {
		if (confirmType === 'reset') return t.break_catalog_confirm_reset_description();
		if (confirmType === 'delete') return t.break_catalog_confirm_delete_description();
		return '';
	});

	const confirmLabel = $derived.by(() => {
		if (confirmType === 'reset') return t.break_catalog_confirm_reset_button();
		if (confirmType === 'delete') return t.break_catalog_confirm_delete_button();
		return t.break_confirm_dialog_confirm_default();
	});

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
		{ id: 'all' as const, label: t.break_catalog_filter_all(), count: counts.all, icon: undefined },
		{
			id: 'physical' as const,
			label: t.break_category_physical(),
			count: counts.physical,
			icon: Activity
		},
		{
			id: 'mindful' as const,
			label: t.break_category_mindful(),
			count: counts.mindful,
			icon: Sparkles
		},
		{
			id: 'hydration' as const,
			label: t.break_category_hydration(),
			count: counts.hydration,
			icon: Droplet
		}
	]);

	const activeCategoryLabel = $derived(
		activeFilter !== 'all' ? getLocalizedBreakCategory(activeFilter).toLowerCase() : ''
	);

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
		confirmType = 'reset';
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
		confirmType = 'delete';
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
			aria-label={t.break_catalog_filter_group_aria()}
		>
			{#each filterOptions as filter (filter.id)}
				<Button
					type="button"
					variant={activeFilter === filter.id ? 'default' : 'outline'}
					size="sm"
					aria-pressed={activeFilter === filter.id}
					aria-label={t.break_catalog_filter_chip_aria({
						label: filter.label,
						count: filter.count
					})}
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
					size="sm"
					onclick={handleOpenNewHabit}
					class="h-7 cursor-pointer gap-1 px-2.5 text-xs font-medium"
				>
					<Plus data-icon="inline-start" />
					<span>{t.break_catalog_new_habit_button()}</span>
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
			<p class="text-xs font-medium text-muted-foreground">{t.break_catalog_loading()}</p>
		</div>
	{:else if filteredActivities.length > 0}
		<div class="grid grid-cols-1 gap-2.5">
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
					{t.break_catalog_empty_all_title()}
				{:else}
					{t.break_catalog_empty_category_title({ category: activeCategoryLabel })}
				{/if}
			</p>
			<p class="mt-1 max-w-xs text-xs text-muted-foreground">
				{#if breaksState.activities.length === 0}
					{t.break_catalog_empty_all_description()}
				{:else}
					{t.break_catalog_empty_category_description({ category: activeCategoryLabel })}
				{/if}
			</p>
		</div>
	{/if}

	<!-- Discreet Footer for Catalog Maintenance -->
	{#if showActions}
		<div class="flex items-center justify-center border-t border-border/30 pt-1">
			<button
				type="button"
				onclick={handleOpenResetDefaults}
				class="inline-flex cursor-pointer items-center gap-1.5 rounded-sm px-2 py-1 text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
			>
				<RotateCcw class="size-3" />
				<span>{t.break_catalog_reset_defaults_button()}</span>
			</button>
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
