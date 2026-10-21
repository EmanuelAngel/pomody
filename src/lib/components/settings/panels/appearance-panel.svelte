<script lang="ts">
	import * as ToggleGroup from '$lib/components/ui/toggle-group';

	import {
		themeState as defaultThemeState,
		type ThemeState,
		type Theme
	} from '$lib/state/theme.svelte';
	import { t } from '$lib/state/locale.svelte';

	interface Props {
		themeState?: ThemeState;
	}

	let { themeState = defaultThemeState }: Props = $props();

	let selectedTheme = $derived(themeState.current);

	function handleThemeChange(value: string | string[] | undefined) {
		if (typeof value === 'string' && (value === 'dark' || value === 'dawn' || value === 'oled')) {
			themeState.setTheme(value as Theme);
			selectedTheme = value;
		}
	}
</script>

<div class="flex flex-col gap-3">
	<div>
		<h3 class="text-sm font-semibold tracking-wide text-foreground">
			{t.settings_section_theme()}
		</h3>
		<p class="mt-0.5 text-xs text-muted-foreground">
			{t.settings_section_theme_description()}
		</p>
	</div>

	<ToggleGroup.Root
		type="single"
		bind:value={selectedTheme}
		onValueChange={handleThemeChange}
		variant="outline"
		spacing={2}
		aria-label={t.settings_theme_aria()}
		class="grid grid-cols-3 gap-2"
	>
		<ToggleGroup.Item
			value="dark"
			aria-label={t.settings_theme_dark_aria()}
			class="flex h-auto flex-col items-center justify-center gap-1.5 py-3 data-[state=on]:border-primary data-[state=on]:bg-muted/60"
		>
			<span
				class="flex size-4 items-center justify-center rounded-full border border-border bg-[#191724] shadow-xs"
			>
				<span class="size-2 rounded-full bg-[#ebbcba]"></span>
			</span>
			<span class="text-xs font-medium">{t.settings_theme_dark()}</span>
		</ToggleGroup.Item>

		<ToggleGroup.Item
			value="dawn"
			aria-label={t.settings_theme_dawn_aria()}
			class="flex h-auto flex-col items-center justify-center gap-1.5 py-3 data-[state=on]:border-primary data-[state=on]:bg-muted/60"
		>
			<span
				class="flex size-4 items-center justify-center rounded-full border border-border bg-[#faf4ed] shadow-xs"
			>
				<span class="size-2 rounded-full bg-[#d7827e]"></span>
			</span>
			<span class="text-xs font-medium">{t.settings_theme_dawn()}</span>
		</ToggleGroup.Item>

		<ToggleGroup.Item
			value="oled"
			aria-label={t.settings_theme_oled_aria()}
			class="flex h-auto flex-col items-center justify-center gap-1.5 py-3 data-[state=on]:border-primary data-[state=on]:bg-muted/60"
		>
			<span
				class="flex size-4 items-center justify-center rounded-full border border-border bg-[#000000] shadow-xs"
			>
				<span class="size-2 rounded-full bg-[#ebbcba]"></span>
			</span>
			<span class="text-xs font-medium">{t.settings_theme_oled()}</span>
		</ToggleGroup.Item>
	</ToggleGroup.Root>
</div>
