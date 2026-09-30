<script lang="ts">
	import Clock from '@lucide/svelte/icons/clock';
	import { cn } from '$lib/utils';

	interface Props {
		freeMarginMinutes: number;
		class?: string;
	}

	let { freeMarginMinutes, class: className = '' }: Props = $props();
</script>

<div class={cn('group relative', className)}>
	<div
		class="absolute top-2.5 -left-6 flex size-5.5 items-center justify-center rounded-full border border-dashed border-accent-gold/40 bg-accent-gold/10 text-accent-gold"
	>
		<Clock class="size-3" />
	</div>
	<div
		class="rounded-xl border border-dashed border-accent-gold/30 bg-accent-gold/5 p-2.5 transition-colors"
	>
		<div class="flex items-center justify-between gap-2">
			<div class="flex items-center gap-2">
				<span class="text-xs font-medium text-foreground">Buffer Time</span>
				<span
					class="rounded bg-accent-gold/15 px-1.5 py-0.5 text-[10px] font-medium text-accent-gold"
				>
					+{freeMarginMinutes}m Extra Buffer
				</span>
			</div>
		</div>
		<p class="mt-0.5 text-[11px] text-muted-foreground/70">
			Available buffer before scheduled finish
		</p>
	</div>
</div>
