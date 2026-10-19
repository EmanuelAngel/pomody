<script lang="ts">
	import {
		ART_HEIGHT,
		ART_WIDTH,
		calculatePixelScale
	} from '$lib/domain/illustration/illustration-progress';
	import { illustrationState, type IllustrationState } from '$lib/state/illustration.svelte';
	import { ILLUSTRATION_RENDERERS } from './renderers';

	let { illustration = illustrationState }: { illustration?: IllustrationState } = $props();

	let host = $state<HTMLDivElement | null>(null);
	let scale = $state(1);

	const Renderer = $derived(ILLUSTRATION_RENDERERS[illustration.selectedId]);
	const artWidth = $derived(ART_WIDTH * scale);
	const artHeight = $derived(ART_HEIGHT * scale);

	$effect(() => {
		const element = host;
		if (!element) {
			return;
		}

		const measure = () => {
			scale = calculatePixelScale(element.clientWidth, element.clientHeight);
		};

		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(element);

		return () => observer.disconnect();
	});
</script>

{#if illustration.isVisible}
	<div
		bind:this={host}
		class="pointer-events-none fixed inset-0 z-0 hidden overflow-hidden select-none md:block"
		data-testid="illustration-background"
		data-scale={scale}
		aria-hidden="true"
	>
		<div class="flex h-full w-full items-end justify-center">
			<div style:width="{artWidth}px" style:height="{artHeight}px">
				<Renderer phase={illustration.phase} animated={illustration.shouldAnimate} />
			</div>
		</div>
	</div>
{/if}
