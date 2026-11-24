<script lang="ts">
	interface Props {
		size?: number;
		class?: string;
	}

	let { size = 18, class: className }: Props = $props();
</script>

<!--
	The mark is a P drawn as the timer's ring, with a sprout on the bowl's shoulder.
	Brand tokens only: accent-rose for the letter, accent-foam for the sprout.
-->
<svg
	viewBox="0 0 64 64"
	width={size}
	height={size}
	class={className}
	aria-hidden="true"
	focusable="false"
>
	<g transform="translate(-1 -2)">
		<g fill="none" stroke="#ebbcba" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
			<path d="M24 56 V 16" />
			<path d="M24 16 A 18 18 0 0 1 24 52" />
		</g>
		<path
			fill="#9ccfd8"
			d="M35 24.5 C 34.3 17, 39.8 10.5, 46.6 8 C 46.1 14.6, 41.4 21.6, 35 24.5 Z"
		/>
	</g>
</svg>
