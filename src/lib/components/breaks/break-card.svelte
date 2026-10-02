<script lang="ts">
	import type { Snippet } from 'svelte';
	import Activity from '@lucide/svelte/icons/activity';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Droplet from '@lucide/svelte/icons/droplet';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Clock from '@lucide/svelte/icons/clock';
	import { cn } from '$lib/utils';
	import type { BreakActivity, BreakCategory } from '$lib/domain/breaks/break-activity.entity';

	interface Props {
		activity: BreakActivity;
		actions?: Snippet<[BreakActivity]>;
		class?: string;
	}

	let { activity, actions, class: className = '' }: Props = $props();

	let isExpanded = $state(false);

	const categoryBadgeClasses: Record<BreakCategory, string> = {
		physical: 'border-accent-gold/40 bg-accent-gold/15 text-accent-gold',
		mindful: 'border-accent-iris/40 bg-accent-iris/15 text-accent-iris',
		hydration: 'border-accent-foam/40 bg-accent-foam/15 text-accent-foam'
	};

	const categoryLabels: Record<BreakCategory, string> = {
		physical: 'Physical',
		mindful: 'Mindful',
		hydration: 'Hydration'
	};
</script>

<article
	data-slot="break-card"
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
				<span
					class={cn(
						'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase',
						categoryBadgeClasses[activity.category]
					)}
				>
					{#if activity.category === 'physical'}
						<Activity class="size-3 shrink-0" />
					{:else if activity.category === 'mindful'}
						<Sparkles class="size-3 shrink-0" />
					{:else if activity.category === 'hydration'}
						<Droplet class="size-3 shrink-0" />
					{/if}
					<span>{categoryLabels[activity.category]}</span>
				</span>

				<!-- Duration Pill -->
				<span
					class="inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
				>
					<Clock class="size-2.5 shrink-0 opacity-70" />
					<span>{activity.durationMinutes}m</span>
				</span>

				<!-- Status Badge: System Preset vs Custom Habit -->
				<span
					class={cn(
						'rounded-full border px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase',
						activity.isPreset
							? 'border-border/40 bg-muted/30 text-muted-foreground/80'
							: 'border-accent-rose/40 bg-accent-rose/10 text-accent-rose'
					)}
				>
					{activity.isPreset ? 'Preset' : 'Custom'}
				</span>
			</div>

			<!-- Right side: Optional actions snippet and expandable guide toggle -->
			<div class="flex items-center gap-1">
				{#if actions}
					{@render actions(activity)}
				{/if}

				{#if activity.guide && activity.guide.trim().length > 0}
					<button
						type="button"
						aria-label={isExpanded
							? `Hide guide for ${activity.title}`
							: `Show guide for ${activity.title}`}
						aria-expanded={isExpanded}
						aria-controls={`guide-${activity.id}`}
						onclick={() => (isExpanded = !isExpanded)}
						class="inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
					>
						<ChevronDown
							class={cn('size-3.5 transition-transform duration-200', isExpanded && 'rotate-180')}
						/>
					</button>
				{/if}
			</div>
		</div>

		<!-- Activity Title -->
		<h4 class="mt-2.5 text-sm font-semibold tracking-tight text-foreground">
			{activity.title}
		</h4>
	</div>

	<!-- Expandable Micro-Guide -->
	{#if isExpanded && activity.guide && activity.guide.trim().length > 0}
		<div
			id={`guide-${activity.id}`}
			class="mt-2.5 border-t border-border/40 pt-2 text-xs/relaxed whitespace-pre-line text-muted-foreground"
		>
			{activity.guide}
		</div>
	{/if}
</article>
