<script lang="ts">
	import { onMount } from 'svelte';
	import * as Popover from '$lib/components/ui/popover';
	import Activity from '@lucide/svelte/icons/activity';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Droplet from '@lucide/svelte/icons/droplet';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Shuffle from '@lucide/svelte/icons/shuffle';
	import { cn } from '$lib/utils';
	import { breaksState as defaultBreaksState, type BreaksState } from '$lib/state/breaks.svelte';
	import { t } from '$lib/state/locale.svelte';
	import {
		getLocalizedPresetTitle,
		getLocalizedPresetGuide
	} from '$lib/components/breaks/break-preset-i18n';
	import type { BreakCategory } from '$lib/domain/breaks/break-activity.entity';

	interface Props {
		breaksState?: BreaksState;
		mode?: 'shortBreak' | 'longBreak';
		currentRound?: number;
		portalProps?: { disabled?: boolean };
	}

	let { breaksState = defaultBreaksState, mode, currentRound, portalProps }: Props = $props();

	let guideOpen = $state(false);
	let isShuffling = $state(false);

	const activeActivity = $derived(breaksState.activeActivity);
	const activeTitle = $derived(activeActivity ? getLocalizedPresetTitle(activeActivity) : '');
	const activeGuide = $derived(
		activeActivity ? getLocalizedPresetGuide(activeActivity) : undefined
	);

	const categoryBadgeClasses: Record<BreakCategory, string> = {
		physical: 'border-accent-gold/40 bg-accent-gold/15 text-accent-gold',
		mindful: 'border-accent-iris/40 bg-accent-iris/15 text-accent-iris',
		hydration: 'border-accent-foam/40 bg-accent-foam/15 text-accent-foam'
	};

	const categoryLabels = $derived<Record<BreakCategory, string>>({
		physical: t.break_category_physical(),
		mindful: t.break_category_mindful(),
		hydration: t.break_category_hydration()
	});

	onMount(() => {
		void breaksState.load();
	});

	$effect(() => {
		// Reading isLoaded tracks reactivity if activities finish loading asynchronously
		void breaksState.isLoaded;
		if ((mode === 'shortBreak' || mode === 'longBreak') && currentRound !== undefined) {
			breaksState.suggestForBreak(`${mode}-${currentRound}`);
		}
	});

	function handleShuffle() {
		isShuffling = true;
		breaksState.shuffle();
		setTimeout(() => {
			isShuffling = false;
		}, 300);
	}
</script>

<div
	data-slot="break-revitalization"
	class="group inline-flex h-8 items-center gap-2 rounded-full border border-border/40 bg-muted/40 px-3 text-xs shadow-xs transition-all duration-200 sm:text-sm"
>
	{#if activeActivity}
		<!-- Category badge with icon and label -->
		<span
			class={cn(
				'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase',
				categoryBadgeClasses[activeActivity.category]
			)}
		>
			{#if activeActivity.category === 'physical'}
				<Activity class="size-3 shrink-0" />
			{:else if activeActivity.category === 'mindful'}
				<Sparkles class="size-3 shrink-0" />
			{:else if activeActivity.category === 'hydration'}
				<Droplet class="size-3 shrink-0" />
			{/if}
			<span>{categoryLabels[activeActivity.category]}</span>
		</span>

		<!-- Activity title with truncation if long -->
		<span
			class="max-w-[130px] truncate font-medium text-foreground sm:max-w-[200px]"
			title={activeTitle}
		>
			{activeTitle}
		</span>

		<!-- Guide Popover Trigger and Content -->
		<Popover.Root bind:open={guideOpen}>
			<Popover.Trigger
				type="button"
				aria-label={t.break_revitalization_view_instructions({ title: activeTitle })}
				class="inline-flex size-6 cursor-pointer items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
			>
				<BookOpen class="size-3.5" />
			</Popover.Trigger>
			<Popover.Content
				{portalProps}
				side="bottom"
				sideOffset={8}
				align="center"
				class="z-50 w-72 animate-in rounded-xl border border-border/60 bg-popover/95 p-3 text-popover-foreground shadow-lg backdrop-blur-md fade-in-0 outline-none zoom-in-95 data-[side=bottom]:slide-in-from-top-2 sm:w-80"
			>
				<div class="mb-2 flex items-center justify-between gap-2 border-b border-border/40 pb-2">
					<span class="truncate text-xs font-semibold text-foreground">
						{activeTitle}
					</span>
					<span
						class={cn(
							'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wider uppercase',
							categoryBadgeClasses[activeActivity.category]
						)}
					>
						{categoryLabels[activeActivity.category]}
					</span>
				</div>
				{#if activeGuide}
					<div class="text-xs leading-relaxed whitespace-pre-line text-muted-foreground">
						{activeGuide}
					</div>
				{:else}
					<p class="text-xs text-muted-foreground italic">
						{t.break_revitalization_no_guide()}
					</p>
				{/if}
			</Popover.Content>
		</Popover.Root>

		<!-- Shuffle button with tactile animation -->
		<button
			type="button"
			aria-label={t.break_revitalization_shuffle_aria()}
			onclick={handleShuffle}
			class={cn(
				'inline-flex size-6 cursor-pointer items-center justify-center rounded-full text-muted-foreground/70 transition-all duration-200 hover:bg-muted hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none active:scale-90',
				isShuffling && 'rotate-180 duration-300'
			)}
		>
			<Shuffle class="size-3.5" />
		</button>
	{:else}
		<span class="text-xs text-muted-foreground/80"
			>{t.break_revitalization_rest_and_revitalize()}</span
		>
	{/if}
</div>
