<script lang="ts">
	import Layers from '@lucide/svelte/icons/layers';
	import Coffee from '@lucide/svelte/icons/coffee';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Clock from '@lucide/svelte/icons/clock';
	import { cn } from '$lib/utils';

	interface Props {
		activeTaskTitle?: string | null;
		class?: string;
	}

	let { activeTaskTitle = null, class: className = '' }: Props = $props();

	// Session Planning skeleton state
	let planTargetMode = $state<'blocks' | 'end_time'>('blocks');
	let blockCount = $state(4);
	let focusMinutes = $state(25);
	let breakMinutes = $state(5);
	let targetEndTime = $state('18:00');

	// Derived metrics for skeleton preview
	const totalFocusMinutes = $derived(blockCount * focusMinutes);
	const totalBreakMinutes = $derived(Math.max(0, blockCount - 1) * breakMinutes);
</script>

<section class={cn('space-y-6 lg:col-span-7', className)} aria-label="Session Planning">
	<div class="rounded-2xl border border-border/50 bg-card/40 p-5 shadow-xs transition-all">
		<!-- Section Title & Mode Switcher -->
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div class="flex items-center gap-2.5">
				<div class="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
					<Layers class="size-4" />
				</div>
				<div>
					<h3 class="text-sm font-semibold tracking-tight text-foreground sm:text-base">
						Session Timeline
					</h3>
					<p class="text-xs text-muted-foreground">Project focus cycles and scheduled breaks</p>
				</div>
			</div>

			<!-- Target Mode Toggle (Blocks vs End Time) -->
			<div class="flex items-center rounded-lg border border-border/50 bg-muted/30 p-0.5 text-xs">
				<button
					type="button"
					class={cn(
						'cursor-pointer rounded-md px-2.5 py-1 font-medium transition-colors',
						planTargetMode === 'blocks'
							? 'bg-background text-foreground shadow-xs'
							: 'text-muted-foreground hover:text-foreground'
					)}
					onclick={() => (planTargetMode = 'blocks')}
				>
					By Blocks
				</button>
				<button
					type="button"
					class={cn(
						'cursor-pointer rounded-md px-2.5 py-1 font-medium transition-colors',
						planTargetMode === 'end_time'
							? 'bg-background text-foreground shadow-xs'
							: 'text-muted-foreground hover:text-foreground'
					)}
					onclick={() => (planTargetMode = 'end_time')}
				>
					By End Time
				</button>
			</div>
		</div>

		<!-- Target Configuration / Metrics Strip -->
		<div
			class="mt-4 grid grid-cols-3 gap-2.5 rounded-xl border border-border/40 bg-muted/20 p-3 text-center sm:gap-4"
		>
			<div>
				<span class="block text-[11px] font-medium text-muted-foreground">Focus Blocks</span>
				<span class="text-sm font-semibold tracking-tight text-foreground sm:text-base">
					{blockCount} × {focusMinutes}m
				</span>
			</div>
			<div>
				<span class="block text-[11px] font-medium text-muted-foreground">Total Focus</span>
				<span class="text-sm font-semibold tracking-tight text-primary sm:text-base">
					{Math.floor(totalFocusMinutes / 60)}h {totalFocusMinutes % 60}m
				</span>
			</div>
			<div>
				<span class="block text-[11px] font-medium text-muted-foreground">
					{planTargetMode === 'blocks' ? 'Total Breaks' : 'Target End'}
				</span>
				<span class="text-sm font-semibold tracking-tight text-foreground sm:text-base">
					{planTargetMode === 'blocks' ? `${totalBreakMinutes}m` : targetEndTime}
				</span>
			</div>
		</div>

		<!-- Chronological Timeline Preview Track -->
		<div
			class="relative mt-6 space-y-3.5 pl-6 before:absolute before:top-2 before:bottom-2 before:left-2.5 before:w-0.5 before:bg-border/60"
		>
			<!-- Block 1: Focus (Active / Current) -->
			<div class="group relative">
				<div
					class="absolute top-2.5 -left-6 flex size-5.5 items-center justify-center rounded-full border border-primary/50 bg-primary/20 text-primary shadow-xs"
				>
					<span class="text-[10px] font-bold">1</span>
				</div>
				<div class="rounded-xl border border-primary/40 bg-primary/5 p-3 transition-colors">
					<div class="flex items-center justify-between gap-2">
						<div class="flex items-center gap-2">
							<span class="text-xs font-semibold text-foreground">Focus Block</span>
							<span
								class="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary"
							>
								{focusMinutes}m
							</span>
						</div>
						<span class="text-[11px] font-medium text-primary">Active block</span>
					</div>
					<p class="mt-1 truncate text-xs text-muted-foreground">
						{#if activeTaskTitle}
							Assigned: <span class="font-medium text-foreground">{activeTaskTitle}</span>
						{:else}
							Unassigned · Will run in Free Focus
						{/if}
					</p>
				</div>
			</div>

			<!-- Block 2: Short Break -->
			<div class="group relative">
				<div
					class="absolute top-2.5 -left-6 flex size-5.5 items-center justify-center rounded-full border border-border/60 bg-muted text-muted-foreground"
				>
					<Coffee class="size-3" />
				</div>
				<div class="rounded-xl border border-border/30 bg-muted/20 p-2.5 transition-colors">
					<div class="flex items-center justify-between gap-2">
						<div class="flex items-center gap-2">
							<span class="text-xs font-medium text-muted-foreground">Short Break</span>
							<span
								class="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
							>
								{breakMinutes}m
							</span>
						</div>
						<span class="flex items-center gap-1 text-[11px] text-muted-foreground/70">
							<Sparkles class="size-3 text-amber-500/80" />
							<span>Revitalization</span>
						</span>
					</div>
					<p class="mt-0.5 text-[11px] text-muted-foreground/80">
						Guided pause: Neck & shoulder stretch or hydration
					</p>
				</div>
			</div>

			<!-- Block 3: Focus (Upcoming) -->
			<div class="group relative">
				<div
					class="absolute top-2.5 -left-6 flex size-5.5 items-center justify-center rounded-full border border-border/60 bg-muted text-muted-foreground"
				>
					<span class="text-[10px] font-semibold text-muted-foreground">2</span>
				</div>
				<div class="rounded-xl border border-border/40 bg-card/60 p-3 transition-colors">
					<div class="flex items-center justify-between gap-2">
						<div class="flex items-center gap-2">
							<span class="text-xs font-medium text-foreground">Focus Block</span>
							<span
								class="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
							>
								{focusMinutes}m
							</span>
						</div>
						<span class="text-[11px] text-muted-foreground/60">Upcoming</span>
					</div>
					<p class="mt-1 text-xs text-muted-foreground/70">
						Select next task from backlog or set during transition
					</p>
				</div>
			</div>

			<!-- Block 4: Long Break Milestone -->
			<div class="group relative">
				<div
					class="absolute top-2.5 -left-6 flex size-5.5 items-center justify-center rounded-full border border-border/60 bg-muted text-muted-foreground"
				>
					<Clock class="size-3" />
				</div>
				<div
					class="rounded-xl border border-dashed border-border/50 bg-muted/10 p-2.5 transition-colors"
				>
					<div class="flex items-center justify-between gap-2">
						<div class="flex items-center gap-2">
							<span class="text-xs font-medium text-muted-foreground">Long Break</span>
							<span
								class="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
							>
								15m
							</span>
						</div>
						<span class="text-[11px] text-muted-foreground/60">Milestone</span>
					</div>
					<p class="mt-0.5 text-[11px] text-muted-foreground/70">Physical reset & mindful pause</p>
				</div>
			</div>
		</div>

		<!-- Forward-Only Architecture Badge / Notice -->
		<div class="mt-5 rounded-xl border border-border/30 bg-muted/10 p-3">
			<p class="text-[11px] leading-relaxed text-muted-foreground/80">
				<strong class="font-medium text-foreground">Forward-only sync:</strong> Editing durations or adding
				blocks applies starting from your next cycle. Active blocks preserve uninterrupted focus.
			</p>
		</div>
	</div>
</section>
