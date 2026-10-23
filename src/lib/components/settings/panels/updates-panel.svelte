<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { updateState as defaultUpdateState, type UpdateState } from '$lib/state/update.svelte';
	import { t } from '$lib/state/locale.svelte';

	interface Props {
		updateState?: UpdateState;
	}

	let { updateState = defaultUpdateState }: Props = $props();

	/** Nothing to offer on the web build, where the updater is a no-op (spec S9). */
	const supported = $derived(updateState.isSupported);

	/**
	 * One deterministic line about where the updater stands. While a request is in
	 * flight the request itself is the news; afterwards "update available" outranks
	 * "check failed", because an update found earlier survives a later failed check.
	 */
	const statusLine = $derived.by(() => {
		if (updateState.status === 'checking') return t.settings_updates_checking();
		if (updateState.status === 'installing') return t.settings_updates_installing();
		if (updateState.hasUpdate)
			return t.settings_updates_available({ version: updateState.info?.version ?? '' });
		if (updateState.lastCheckFailed) return t.settings_updates_check_failed();
		if (updateState.upToDate) return t.settings_updates_up_to_date();

		return '';
	});

	function handleCheckNow() {
		void updateState.checkNow();
	}

	function handleInstall() {
		void updateState.install();
	}
</script>

{#if supported}
	<div class="flex flex-col gap-3">
		<div>
			<h3 class="text-sm font-semibold tracking-wide text-foreground">
				{t.settings_section_updates()}
			</h3>
			<p class="mt-0.5 text-xs text-muted-foreground">
				{t.settings_section_updates_description()}
			</p>
		</div>

		<div class="flex flex-col gap-3 rounded-lg border border-border p-3.5 shadow-xs">
			<p class="text-xs font-medium text-foreground" role="status">{statusLine}</p>

			{#if updateState.info?.notes}
				<div class="flex flex-col gap-1">
					<span class="text-xs font-medium text-foreground">
						{t.settings_updates_release_notes()}
					</span>
					<!-- Plain text on purpose: the changelog is untrusted feed content, so it is
					     never parsed or injected as HTML, only preserved with its line breaks. -->
					<p class="max-h-40 overflow-y-auto text-xs whitespace-pre-wrap text-muted-foreground">
						{updateState.info.notes}
					</p>
				</div>
			{/if}

			<div class="flex items-center gap-2">
				<Button
					variant="outline"
					aria-label={t.settings_updates_check_now_aria()}
					disabled={updateState.status !== 'idle'}
					onclick={handleCheckNow}
					class="h-8 px-3 text-xs"
				>
					{t.settings_updates_check_now()}
				</Button>

				{#if updateState.hasUpdate}
					<Button
						aria-label={t.settings_updates_install_aria()}
						aria-describedby={updateState.installBlockedByTimer
							? 'updates-install-blocked'
							: undefined}
						disabled={!updateState.canInstall}
						onclick={handleInstall}
						class="h-8 px-3 text-xs"
					>
						{t.settings_updates_install()}
					</Button>
				{/if}
			</div>

			{#if updateState.hasUpdate && updateState.installBlockedByTimer}
				<p id="updates-install-blocked" class="text-xs text-muted-foreground">
					{t.settings_updates_install_blocked()}
				</p>
			{/if}

			{#if updateState.installFailed}
				<p class="text-xs text-destructive" role="status">
					{t.settings_updates_install_failed()}
				</p>
			{/if}
		</div>
	</div>
{/if}
