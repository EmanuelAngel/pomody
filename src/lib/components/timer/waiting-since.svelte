<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { formatElapsed } from '$lib/domain/timer/elapsed-since';
	import { motionIn, motionOut } from '$lib/utils/motion';
	import { t } from '$lib/state/locale.svelte';

	interface Props {
		/** Instant the timer started waiting for the user; `null` while it is not waiting. */
		waitingSince: number | null;
		/** What the timer is waiting for, so the copy names it: a pause or a finished block. */
		kind: 'paused' | 'completed' | null;
		/** Injectable clock, so the label can be asserted without waiting for the wall clock. */
		now?: () => number;
	}

	let { waitingSince, kind, now = () => Date.now() }: Props = $props();

	/** Bumped once a second. It is the only thing that makes the derived label recompute. */
	let tick = $state(0);

	$effect(() => {
		if (waitingSince === null) {
			return;
		}

		const id = setInterval(() => {
			tick += 1;
		}, 1000);

		return () => clearInterval(id);
	});

	const label = $derived.by(() => {
		void tick;

		if (waitingSince === null || kind === null) {
			return null;
		}

		const elapsed = formatElapsed(Math.max(0, now() - waitingSince));

		return kind === 'paused'
			? t.timer_waiting_since_paused({ elapsed })
			: t.timer_waiting_since_completed({ elapsed });
	});
</script>

{#if label !== null}
	<!--
		The counter mounts and unmounts every time the timer is paused, resumed or
		completed, so it is one of the few surfaces where an entry transition is not
		decoration: without it the line under the clock appears out of nowhere and
		the view reads as having jumped.
	-->
	<p
		class="text-xs text-muted-foreground tabular-nums sm:text-sm"
		data-waiting-since={kind}
		in:fly={motionIn()}
		out:fade={motionOut()}
	>
		{label}
	</p>
{/if}
