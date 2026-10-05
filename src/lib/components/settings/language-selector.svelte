<script lang="ts">
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import {
		localeState as defaultLocaleState,
		type LocaleState,
		type AvailableLanguageTag,
		t
	} from '$lib/state/locale.svelte';
	import { cn } from '$lib/utils';

	interface Props {
		localeState?: LocaleState;
		class?: string;
	}

	let { localeState = defaultLocaleState, class: className }: Props = $props();

	function handleValueChange(value: string) {
		if (value === 'en' || value === 'es') {
			localeState.setLocale(value as AvailableLanguageTag);
		}
	}
</script>

<div class={cn('flex flex-col gap-3', className)}>
	<div>
		<h3 class="text-sm font-semibold tracking-wide text-foreground">
			{localeState.current ? t.settings_section_language() : ''}
		</h3>
		<p class="mt-0.5 text-xs text-muted-foreground">
			{localeState.current ? t.settings_section_language_description() : ''}
		</p>
	</div>

	<ToggleGroup.Root
		type="single"
		value={localeState.current}
		onValueChange={handleValueChange}
		variant="outline"
		spacing={2}
		aria-label={localeState.current ? t.settings_language_aria() : ''}
		class="grid grid-cols-2 gap-2"
	>
		<ToggleGroup.Item
			value="en"
			aria-label={localeState.current ? t.settings_language_en_aria() : ''}
			class="flex h-auto flex-col items-center justify-center gap-1.5 py-3 data-[state=on]:border-primary data-[state=on]:bg-muted/60"
		>
			<span class="text-xs font-semibold tracking-wider uppercase">EN</span>
			<span class="text-xs font-medium text-muted-foreground"
				>{localeState.current ? t.settings_language_en() : ''}</span
			>
		</ToggleGroup.Item>

		<ToggleGroup.Item
			value="es"
			aria-label={localeState.current ? t.settings_language_es_aria() : ''}
			class="flex h-auto flex-col items-center justify-center gap-1.5 py-3 data-[state=on]:border-primary data-[state=on]:bg-muted/60"
		>
			<span class="text-xs font-semibold tracking-wider uppercase">ES</span>
			<span class="text-xs font-medium text-muted-foreground"
				>{localeState.current ? t.settings_language_es() : ''}</span
			>
		</ToggleGroup.Item>
	</ToggleGroup.Root>
</div>
