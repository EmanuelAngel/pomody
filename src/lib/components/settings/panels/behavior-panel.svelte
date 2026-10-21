<script lang="ts">
	import { Separator } from '$lib/components/ui/separator';
	import { Switch } from '$lib/components/ui/switch';

	import { timerState as defaultTimerState, type TimerState } from '$lib/state/timer.svelte';
	import {
		distractionState as defaultDistractionState,
		type DistractionState
	} from '$lib/state/distractionState.svelte';
	import {
		blockNoticeState as defaultBlockNoticeState,
		type BlockNoticeState
	} from '$lib/state/block-notice.svelte';
	import { t } from '$lib/state/locale.svelte';

	interface Props {
		timerState?: TimerState;
		distractionState?: DistractionState;
		blockNoticeState?: BlockNoticeState;
	}

	let {
		timerState = defaultTimerState,
		distractionState = defaultDistractionState,
		blockNoticeState = defaultBlockNoticeState
	}: Props = $props();

	/** No detector surface on a platform that cannot read other windows (spec §1). */
	const distractionDetectorSupported = $derived(distractionState.isSupported);
</script>

<div class="flex flex-col gap-6">
	<!-- Sound Alerts -->
	<div class="flex flex-col gap-3">
		<div>
			<h3 class="text-sm font-semibold tracking-wide text-foreground">
				{t.settings_section_sound()}
			</h3>
			<p class="mt-0.5 text-xs text-muted-foreground">
				{t.settings_section_sound_description()}
			</p>
		</div>

		<div class="flex items-center justify-between rounded-lg border border-border p-3.5 shadow-xs">
			<div class="flex flex-col gap-0.5">
				<span class="text-xs font-medium text-foreground">{t.settings_sound_alerts()}</span>
				<span class="text-xs text-muted-foreground">{t.settings_sound_alerts_description()}</span>
			</div>
			<Switch
				checked={timerState.soundEnabled}
				onCheckedChange={(checked) => timerState.setSoundEnabled(checked)}
				aria-label={t.settings_sound_alerts_aria()}
			/>
		</div>
	</div>

	<Separator />

	<!-- Block-End Notifications -->
	<div class="flex flex-col gap-3">
		<div>
			<h3 class="text-sm font-semibold tracking-wide text-foreground">
				{t.settings_section_notifications()}
			</h3>
			<p class="mt-0.5 text-xs text-muted-foreground">
				{t.settings_section_notifications_description()}
			</p>
		</div>

		<div class="flex items-center justify-between rounded-lg border border-border p-3.5 shadow-xs">
			<div class="flex flex-col gap-0.5">
				<span class="text-xs font-medium text-foreground">{t.settings_block_notifications()}</span>
				<span class="text-xs text-muted-foreground"
					>{t.settings_block_notifications_description()}</span
				>
			</div>
			<Switch
				checked={blockNoticeState.enabled}
				onCheckedChange={(checked) => blockNoticeState.setEnabled(checked)}
				aria-label={t.settings_block_notifications_aria()}
			/>
		</div>

		{#if blockNoticeState.permissionDenied}
			<p class="text-xs text-destructive" role="status">
				{t.settings_block_notifications_permission_denied()}
			</p>
		{/if}
	</div>

	<Separator />

	<!-- Break Revitalization -->
	<div class="flex flex-col gap-3">
		<div>
			<h3 class="text-sm font-semibold tracking-wide text-foreground">
				{t.settings_section_revitalization()}
			</h3>
			<p class="mt-0.5 text-xs text-muted-foreground">
				{t.settings_section_revitalization_description()}
			</p>
		</div>

		<div class="flex items-center justify-between rounded-lg border border-border p-3.5 shadow-xs">
			<div class="flex flex-col gap-0.5">
				<span class="text-xs font-medium text-foreground"
					>{t.settings_revitalization_suggestions()}</span
				>
				<span class="text-xs text-muted-foreground"
					>{t.settings_revitalization_suggestions_description()}</span
				>
			</div>
			<Switch
				checked={timerState.revitalizationEnabled}
				onCheckedChange={(checked) => timerState.setRevitalizationEnabled(checked)}
				aria-label={t.settings_revitalization_suggestions_aria()}
			/>
		</div>
	</div>

	{#if distractionDetectorSupported}
		<Separator />

		<!-- Distraction Detector (off by default) -->
		<div class="flex flex-col gap-3">
			<div>
				<h3 class="text-sm font-semibold tracking-wide text-foreground">
					{t.settings_section_distraction()}
				</h3>
				<p class="mt-0.5 text-xs text-muted-foreground">
					{t.settings_section_distraction_description()}
				</p>
			</div>

			<div
				class="flex items-center justify-between rounded-lg border border-border p-3.5 shadow-xs"
			>
				<span class="text-xs font-medium text-foreground">{t.settings_distraction_detector()}</span>
				<Switch
					checked={distractionState.enabled}
					onCheckedChange={(checked) => distractionState.setEnabled(checked)}
					aria-label={t.settings_distraction_detector_aria()}
				/>
			</div>
		</div>
	{/if}
</div>
