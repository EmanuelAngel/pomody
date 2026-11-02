<script lang="ts">
	import { formatElapsed } from '$lib/domain/timer/elapsed-since';
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
	<p class="text-xs text-muted-foreground tabular-nums sm:text-sm" data-waiting-since={kind}>
		{label}
	</p>
{/if}
