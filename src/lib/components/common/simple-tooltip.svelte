<script lang="ts">
	import * as Tooltip from '$lib/components/ui/tooltip';
	import type { Snippet } from 'svelte';

	interface Props {
		/** Tooltip text; when undefined the trigger renders without any tooltip. */
		text?: string;
		side?: 'top' | 'bottom' | 'left' | 'right';
		sideOffset?: number;
		contentClass?: string;
		delayDuration?: number;
		children: Snippet<[{ props: Record<string, unknown> }]>;
	}

	let {
		text,
		side = 'top',
		sideOffset = 6,
		contentClass,
		delayDuration = 300,
		children
	}: Props = $props();
</script>

{#if text === undefined}
	{@render children({ props: {} })}
{:else}
	<Tooltip.Provider {delayDuration}>
		<Tooltip.Root>
			<Tooltip.Trigger>
				{#snippet child({ props })}
					{@render children({ props })}
				{/snippet}
			</Tooltip.Trigger>
			<Tooltip.Content {side} {sideOffset} class={contentClass}>
				{text}
			</Tooltip.Content>
		</Tooltip.Root>
	</Tooltip.Provider>
{/if}
