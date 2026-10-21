<script lang="ts">
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import { Switch } from '$lib/components/ui/switch';

	import {
		illustrationState as defaultIllustrationState,
		type IllustrationState
	} from '$lib/state/illustration.svelte';
	import { t } from '$lib/state/locale.svelte';
	import { ILLUSTRATION_CATALOG } from '$lib/domain/illustration/illustration-catalog';
	import { ILLUSTRATION_RENDERERS } from '$lib/components/illustration/renderers';

	interface Props {
		illustrationState?: IllustrationState;
	}

	let { illustrationState = defaultIllustrationState }: Props = $props();

	function illustrationLabel(key: string): string {
		const message = (t as unknown as Record<string, (() => string) | undefined>)[key];
		return message ? message() : key;
	}
</script>

<div class="flex flex-col gap-3">
	<div>
		<h3 class="text-sm font-semibold tracking-wide text-foreground">
			{t.settings_section_illustration()}
		</h3>
		<p class="mt-0.5 text-xs text-muted-foreground">
			{t.settings_section_illustration_description()}
		</p>
	</div>

	<div class="flex items-center justify-between rounded-lg border border-border p-3.5 shadow-xs">
		<div class="flex flex-col gap-0.5">
			<span class="text-xs font-medium text-foreground">{t.settings_illustration_enabled()}</span>
			<span class="text-xs text-muted-foreground"
				>{t.settings_illustration_enabled_description()}</span
			>
		</div>
		<Switch
			checked={illustrationState.enabled}
			onCheckedChange={(checked) => illustrationState.setEnabled(checked)}
			aria-label={t.settings_illustration_enabled_aria()}
		/>
	</div>

	<div class="flex items-center justify-between rounded-lg border border-border p-3.5 shadow-xs">
		<div class="flex flex-col gap-0.5">
			<span class="text-xs font-medium text-foreground">{t.settings_illustration_motion()}</span>
			<span class="text-xs text-muted-foreground"
				>{t.settings_illustration_motion_description()}</span
			>
		</div>
		<Switch
			checked={illustrationState.motionEnabled}
			onCheckedChange={(checked) => illustrationState.setMotionEnabled(checked)}
			aria-label={t.settings_illustration_motion_aria()}
		/>
	</div>

	<div class="flex items-center justify-between rounded-lg border border-border p-3.5 shadow-xs">
		<div class="flex flex-col gap-0.5">
			<span class="text-xs font-medium text-foreground">{t.settings_illustration_hide_focus()}</span
			>
			<span class="text-xs text-muted-foreground"
				>{t.settings_illustration_hide_focus_description()}</span
			>
		</div>
		<Switch
			checked={illustrationState.hideWhileFocusing}
			onCheckedChange={(checked) => illustrationState.setHideWhileFocusing(checked)}
			aria-label={t.settings_illustration_hide_focus_aria()}
		/>
	</div>

	<ToggleGroup.Root
		type="single"
		value={illustrationState.selectedId}
		onValueChange={(value) => {
			if (typeof value === 'string' && value.length > 0) {
				illustrationState.setSelectedId(value);
			}
		}}
		variant="outline"
		spacing={2}
		aria-label={t.settings_illustration_select_aria()}
		class="grid grid-cols-2 gap-2"
	>
		{#each ILLUSTRATION_CATALOG as entry (entry.id)}
			{@const IllustrationRenderer = ILLUSTRATION_RENDERERS[entry.id]}
			<ToggleGroup.Item
				value={entry.id}
				aria-label={illustrationLabel(entry.labelKey)}
				class="flex h-auto flex-col items-center justify-center gap-1.5 py-2 data-[state=on]:border-primary data-[state=on]:bg-muted/60"
			>
				<span class="h-10 w-full overflow-hidden rounded-sm border border-border">
					<IllustrationRenderer phase={entry.phaseCount - 1} animated={false} />
				</span>
				<span class="text-xs font-medium">{illustrationLabel(entry.labelKey)}</span>
			</ToggleGroup.Item>
		{/each}
	</ToggleGroup.Root>
</div>
