<script lang="ts">
	import SettingsTrigger from './settings-trigger.svelte';
	import SettingsDrawer from './settings-drawer.svelte';
	import type { TimerState } from '$lib/state/timer.svelte';
	import type { ThemeState } from '$lib/state/theme.svelte';

	interface Props {
		timerState?: TimerState;
		themeState?: ThemeState;
		open?: boolean;
	}

	let { timerState, themeState, open = $bindable(false) }: Props = $props();
</script>

<SettingsTrigger bind:open {timerState} />
<SettingsDrawer bind:open {timerState} {themeState} portalProps={{ disabled: true }} />
