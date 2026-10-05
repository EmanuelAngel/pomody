<script lang="ts">
	import type { Snippet } from 'svelte';
	import { slide } from 'svelte/transition';
	import Activity from '@lucide/svelte/icons/activity';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Droplet from '@lucide/svelte/icons/droplet';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Clock from '@lucide/svelte/icons/clock';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import type { BreakActivity, BreakCategory } from '$lib/domain/breaks/break-activity.entity';
	import {
		getLocalizedPresetTitle,
		getLocalizedPresetGuide,
		getLocalizedBreakCategory
	} from './break-preset-i18n';
	import { t } from '$lib/state/locale.svelte';

	interface Props {
		activity: BreakActivity;
		actions?: Snippet<[BreakActivity]>;
		onEdit?: (activity: BreakActivity) => void;
		onDelete?: (activity: BreakActivity) => void;
		class?: string;
	}

	let { activity, actions, onEdit, onDelete, class: className = '' }: Props = $props();

	let isExpanded = $state(false);

	const localizedTitle = $derived(getLocalizedPresetTitle(activity));
	const localizedGuide = $derived(getLocalizedPresetGuide(activity));
	const localizedCategory = $derived(getLocalizedBreakCategory(activity.category));

	const categoryBadgeClasses: Record<BreakCategory, string> = {
		physical: 'border-accent-gold/40 bg-accent-gold/15 text-accent-gold',
		mindful: 'border-accent-iris/40 bg-accent-iris/15 text-accent-iris',
		hydration: 'border-accent-foam/40 bg-accent-foam/15 text-accent-foam'
	};
</script>

<article
	data-slot="break-card"
	data-preset={activity.isPreset}
	class={cn(
		'group flex flex-col justify-between rounded-xl border border-border/50 bg-card p-3.5 shadow-xs transition-colors hover:border-border/80',
		className
	)}
>
	<div>
		<!-- Top header row: Badges on left, Actions and Guide toggle on right -->
		<div class="flex items-center justify-between gap-2">
			<div class="flex flex-wrap items-center gap-1.5">
				<!-- Category Badge -->
				<Badge
					variant="outline"
					class={cn('text-[10px] tracking-wide uppercase', categoryBadgeClasses[activity.category])}
				>
					{#if activity.category === 'physical'}
						<Activity data-icon="inline-start" />
					{:else if activity.category === 'mindful'}
						<Sparkles data-icon="inline-start" />
					{:else if activity.category === 'hydration'}
						<Droplet data-icon="inline-start" />
					{/if}
					<span>{localizedCategory}</span>
				</Badge>

				<!-- Duration Pill -->
				<Badge
					variant="outline"
					class="border-border/40 bg-muted/40 text-[10px] font-medium text-muted-foreground"
				>
					<Clock data-icon="inline-start" class="opacity-70" />
					<span>{activity.durationMinutes}m</span>
				</Badge>
			</div>

			<!-- Right side: Optional actions snippet, Edit/Delete (custom habits only), and expandable guide toggle -->
			<div class="flex items-center gap-1">
				{#if !activity.isPreset}
					{#if onEdit}
						<Button
							variant="ghost"
							size="icon-xs"
							aria-label={t.break_card_edit_habit_aria({ title: localizedTitle })}
							onclick={() => onEdit(activity)}
							class="text-muted-foreground/70 hover:text-foreground"
						>
							<Pencil data-icon="inline-start" />
						</Button>
					{/if}
					{#if onDelete}
						<Button
							variant="ghost"
							size="icon-xs"
							aria-label={t.break_card_delete_habit_aria({ title: localizedTitle })}
							onclick={() => onDelete(activity)}
							class="text-muted-foreground/70 hover:bg-destructive/10 hover:text-destructive"
						>
							<Trash2 data-icon="inline-start" />
						</Button>
					{/if}
				{/if}

				{#if actions}
					{@render actions(activity)}
				{/if}

				{#if localizedGuide && localizedGuide.trim().length > 0}
					<Button
						variant="ghost"
						size="icon-xs"
						aria-label={isExpanded
							? t.break_card_hide_guide_aria({ title: localizedTitle })
							: t.break_card_show_guide_aria({ title: localizedTitle })}
						aria-expanded={isExpanded}
						aria-controls={isExpanded ? `guide-${activity.id}` : undefined}
						onclick={() => (isExpanded = !isExpanded)}
						class="text-muted-foreground/70 hover:text-foreground"
					>
						<ChevronDown
							data-icon="inline-start"
							class={cn('transition-transform duration-200', isExpanded && 'rotate-180')}
						/>
					</Button>
				{/if}
			</div>
		</div>

		<!-- Activity Title -->
		<h4 class="mt-2.5 text-sm font-semibold tracking-tight text-foreground">
			{localizedTitle}
		</h4>
	</div>

	<!-- Expandable Micro-Guide with smooth slide transition -->
	{#if isExpanded && localizedGuide && localizedGuide.trim().length > 0}
		<div transition:slide={{ duration: 200 }}>
			<div
				id={`guide-${activity.id}`}
				class="mt-2.5 border-t border-border/40 pt-2 text-xs/relaxed whitespace-pre-line text-muted-foreground"
			>
				{localizedGuide}
			</div>
		</div>
	{/if}
</article>
