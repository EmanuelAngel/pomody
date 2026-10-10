<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import CircleDot from '@lucide/svelte/icons/circle-dot';
	import Leaf from '@lucide/svelte/icons/leaf';
	import Sprout from '@lucide/svelte/icons/sprout';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import SkipForward from '@lucide/svelte/icons/skip-forward';
	import Maximize2 from '@lucide/svelte/icons/maximize-2';
	import Play from '@lucide/svelte/icons/play';
	import Pause from '@lucide/svelte/icons/pause';
	import { cn } from '$lib/utils';
	import { timerState as defaultTimerState, type TimerState } from '$lib/state/timer.svelte';
	import { tasksState as defaultTasksState, type TasksState } from '$lib/state/tasks.svelte';
	import {
		windowState as defaultWindowState,
		type WindowState
	} from '$lib/state/windowState.svelte';
	import { t } from '$lib/state/locale.svelte';
	import type { Attachment } from 'svelte/attachments';

	interface Props {
		timerState?: TimerState;
		tasksState?: TasksState;
		windowState?: WindowState;
	}

	let {
		timerState = defaultTimerState,
		tasksState = defaultTasksState,
		windowState = defaultWindowState
	}: Props = $props();

	/**
	 * Single hover flag for the whole widget: it governs both the progressive
	 * revelation of the secondary button row and the title marquee. Two zones
	 * overlap inside 64px of height, so the user cannot tell them apart.
	 */
	let hovered = $state(false);

	/** Whether the title is actually wider than the space it is given. */
	let titleOverflows = $state(false);

	const mode = $derived(timerState.mode);
	const isPaused = $derived(timerState.state === 'paused');
	const activeTask = $derived(tasksState.activeTask);
	const progress = $derived(
		Number.isFinite(timerState.progress) ? Math.min(1, Math.max(0, timerState.progress)) : 0
	);

	const ModeIcon = $derived(mode === 'focus' ? CircleDot : mode === 'shortBreak' ? Leaf : Sprout);

	const modeAccent = $derived(
		mode === 'focus'
			? 'bg-accent-foam/10 text-accent-foam'
			: mode === 'shortBreak'
				? 'bg-accent-pine/10 text-accent-pine'
				: 'bg-accent-iris/10 text-accent-iris'
	);

	const modeBarColor = $derived(
		mode === 'focus'
			? 'bg-accent-foam'
			: mode === 'shortBreak'
				? 'bg-accent-pine'
				: 'bg-accent-iris'
	);

	/** Break modes describe themselves in the left column; focus shows the task. */
	const label = $derived(
		mode === 'focus'
			? activeTask
				? activeTask.title
				: t.task_pill_free_focus()
			: mode === 'shortBreak'
				? t.timer_mode_short_break()
				: t.timer_mode_long_break()
	);

	const isLabelMuted = $derived(mode !== 'focus' || !activeTask);
	const marqueeActive = $derived(hovered && titleOverflows);

	/**
	 * The marquee track is always the first child of the clipping viewport.
	 * An attachment keeps the measurement tied to the element that owns the
	 * geometry, instead of a manual `bind:this` read from an event handler.
	 */
	function titleViewport(text: string): Attachment<HTMLElement> {
		return (viewport) => {
			const track = viewport.firstElementChild;
			if (!track) return;
			titleOverflows = track.scrollWidth > viewport.clientWidth + 1;
			void text;
		};
	}

	function handlePointerEnter() {
		hovered = true;
	}

	function handlePointerLeave() {
		hovered = false;
	}

	function handlePlayPause() {
		if (timerState.isRunning) {
			timerState.pause();
		} else if (isPaused) {
			timerState.resume();
		} else {
			timerState.start();
		}
	}

	function handleReset() {
		timerState.reset();
	}

	function handleSkip() {
		timerState.skip();
	}

	function handleRestore() {
		void windowState.restore();
	}

	const playPauseLabel = $derived(
		timerState.isRunning
			? t.timer_controls_pause()
			: isPaused
				? t.timer_controls_resume()
				: t.timer_controls_start()
	);
</script>

<!--
	Compact peripheral timer widget (280x64). Three columns: identity + task on the
	left, mathematically centered time in the middle, anchored button row on the right.

	`data-tauri-drag-region` is opt-in and NOT inherited in Tauri v2, so it is applied
	element by element to the left and center columns. The button row never carries it:
	a drag region under a button swallows its clicks.
-->
<div
	role="region"
	aria-label={t.mini_player_compact_aria()}
	data-slot="mini-player"
	data-mode={mode}
	onmouseenter={handlePointerEnter}
	onmouseleave={handlePointerLeave}
	class="relative h-12 w-full overflow-hidden bg-background"
>
	<!--
		Grid, not `absolute left-1/2`. With an absolutely centred timer and a
		`flex-1` label column, the label box ran underneath the digits and the two
		visually collided. Symmetric `1fr` tracks on both sides make the overlap
		impossible by construction: the label's box ends where the timer begins.

		The row is `h-10` inside an `h-12` root because the progress bar owns the
		bottom 8px strip. The window is short on purpose: the content is 24px and
		48px leaves 8px of air above and below. At the previous 64px the row held
		24px of content inside 56px, which left 16px of dead space on each side
		and made the widget read as top-heavy.
	-->
	<div
		data-slot="mini-player-row"
		class="grid h-10 grid-cols-[1fr_auto_1fr] items-center gap-2 px-2"
	>
		<!-- Left column: mode identity + active task / free focus label -->
		<div data-tauri-drag-region class="flex min-w-0 items-center gap-2">
			<span
				data-tauri-drag-region
				data-slot="mini-player-mode-icon"
				class={cn('flex size-5 shrink-0 items-center justify-center rounded-md', modeAccent)}
			>
				<ModeIcon class="size-3" />
			</span>

			<span
				{@attach titleViewport(label)}
				data-tauri-drag-region
				class="block min-w-0 flex-1 overflow-hidden"
			>
				<span
					data-tauri-drag-region
					data-slot="mini-player-marquee-track"
					class={cn(
						'flex w-max text-xs whitespace-nowrap',
						marqueeActive && 'animate-mini-player-marquee gap-8',
						isLabelMuted && 'text-muted-foreground'
					)}
				>
					<span class="truncate">{label}</span>
					{#if marqueeActive}
						<span aria-hidden="true" class="truncate">{label}</span>
					{/if}
				</span>
			</span>
		</div>

		<!-- Centre column: grid-placed, so it stays mathematically centred -->
		<div data-tauri-drag-region class="flex justify-center">
			<span
				data-tauri-drag-region
				data-slot="mini-player-time"
				class="block font-mono text-sm font-medium text-foreground tabular-nums"
			>
				{timerState.formattedTime}
			</span>
		</div>

		<!-- Right column: Play/Pause is the last child and stays anchored to the
		     right edge; the secondary actions only fade in, they never reflow it. -->
		<div data-slot="mini-player-controls" class="flex shrink-0 items-center justify-end gap-1">
			<Button
				variant="ghost"
				size="icon-xs"
				aria-label={t.timer_controls_reset()}
				onclick={handleReset}
				class={cn(
					'rounded-full text-muted-foreground hover:text-foreground',
					hovered ? 'visible opacity-100' : 'invisible opacity-0'
				)}
			>
				<RotateCcw />
			</Button>

			<Button
				variant="ghost"
				size="icon-xs"
				aria-label={t.timer_controls_skip()}
				onclick={handleSkip}
				class={cn(
					'rounded-full text-muted-foreground hover:text-foreground',
					hovered ? 'visible opacity-100' : 'invisible opacity-0'
				)}
			>
				<SkipForward />
			</Button>

			<Button
				variant="ghost"
				size="icon-xs"
				aria-label={t.mini_player_restore()}
				onclick={handleRestore}
				class={cn(
					'rounded-full text-muted-foreground hover:text-foreground',
					hovered ? 'visible opacity-100' : 'invisible opacity-0'
				)}
			>
				<Maximize2 />
			</Button>

			<Button
				variant="default"
				size="icon-xs"
				aria-label={playPauseLabel}
				onclick={handlePlayPause}
				class="rounded-full"
			>
				{#if timerState.isRunning}
					<Pause />
				{:else}
					<Play class="translate-x-px" />
				{/if}
			</Button>
		</div>
	</div>

	<!-- Bottom progress bar: no numeric label by design -->
	<div class="absolute inset-x-0 bottom-0">
		<div class="mx-2 mb-1.5 h-0.5 overflow-hidden rounded-full bg-border/40">
			<div
				data-slot="mini-player-progress"
				style:width={`${progress * 100}%`}
				class={cn('h-full rounded-full', modeBarColor)}
			></div>
		</div>
	</div>
</div>

<style>
	/*
		The track holds two copies of the label separated by `gap-8`. Travelling
		`-50% - 1rem` lands the second copy exactly where the first began while
		leaving the 2rem gap visible on the right, so the loop restarts against
		blank space instead of butting the tail of one title against the head of
		the next. The 5% hold keeps a beat before the text starts moving.
	*/
	@keyframes mini-player-marquee {
		0%,
		5% {
			transform: translateX(0);
		}
		95%,
		100% {
			transform: translateX(calc(-50% - 1rem));
		}
	}

	:global(.animate-mini-player-marquee) {
		animation: mini-player-marquee 10s linear infinite;
	}
</style>
