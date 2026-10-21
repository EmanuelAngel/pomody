<script lang="ts">
	import { Toaster } from '$lib/components/ui/sonner';
	import { themeState as defaultThemeState, type ThemeState } from '$lib/state/theme.svelte';
	import { t } from '$lib/state/locale.svelte';

	interface Props {
		themeState?: ThemeState;
	}

	let { themeState = defaultThemeState }: Props = $props();
</script>

<!--
	Host of the block-end toast.

	`closeButton` is not optional: the notice stays until the timer leaves `completed`, so
	without an X the only way out would be starting the next block — the user could not get
	rid of a notice they already read. svelte-sonner defaults it to false, and the aria label
	comes from the same i18n catalogue as the notice itself.

	The light/dark hint is the only thing sonner gets from the theme: the three Rosé Pine
	palettes are driven by the CSS variables of the vendor component, not by this prop.
-->
<Toaster
	theme={themeState.current === 'dawn' ? 'light' : 'dark'}
	closeButton
	toastOptions={{ closeButtonAriaLabel: t.block_notice_dismiss_aria() }}
/>
