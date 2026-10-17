<script lang="ts">
	import { onMount } from 'svelte';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import MousePointerClick from '@lucide/svelte/icons/mouse-pointer-click';
	import * as Empty from '$lib/components/ui/empty';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import BreakConfirmDialog from '$lib/components/breaks/break-confirm-dialog.svelte';
	import DistractionRuleForm from './distraction-rule-form.svelte';
	import { t } from '$lib/state/locale.svelte';
	import {
		distractionState as defaultDistractionState,
		type DistractionRuleInput,
		type DistractionState
	} from '$lib/state/distractionState.svelte';
	import type { DistractionRule } from '$lib/domain/distraction/distraction-rule.entity';
	import type { OpenWindow } from '$lib/domain/ports/distraction-monitor.port';

	interface Props {
		distractionState?: DistractionState;
		portalProps?: { disabled?: boolean };
	}

	let { distractionState = defaultDistractionState, portalProps }: Props = $props();

	let windows = $state<readonly OpenWindow[]>([]);
	let editingRule = $state<DistractionRule | null>(null);
	let ruleToDelete = $state<DistractionRule | null>(null);
	let isDeleteOpen = $state(false);

	onMount(() => {
		void loadView();
	});

	/**
	 * Reloads on every mount instead of trusting an `isLoaded` flag: the silences of the
	 * day are also written by the notice of slice 5.5, and a stale in-memory copy would
	 * show a rule as silenced after it was released (or the other way around).
	 */
	async function loadView(): Promise<void> {
		await distractionState.load();
		windows = await distractionState.openWindows();
	}

	async function handleSave(input: DistractionRuleInput): Promise<boolean> {
		const saved = await distractionState.saveRule(input);
		if (saved) {
			editingRule = null;
		}
		return saved;
	}

	function handleEdit(rule: DistractionRule) {
		editingRule = rule;
	}

	function handleCancelEdit() {
		editingRule = null;
	}

	function handleDeleteRequest(rule: DistractionRule) {
		ruleToDelete = rule;
		isDeleteOpen = true;
	}

	async function handleConfirmDelete() {
		const rule = ruleToDelete;
		ruleToDelete = null;

		if (rule === null) {
			return;
		}

		await distractionState.deleteRule(rule.id);

		if (editingRule?.id === rule.id) {
			editingRule = null;
		}
	}

	/** `exe — pattern`, or just the executable when the rule covers the whole app. */
	function describeRule(rule: DistractionRule): string {
		return rule.titlePattern ? `${rule.exe} — ${rule.titlePattern}` : rule.exe;
	}
</script>

<div data-slot="distraction-view" class="flex w-full max-w-2xl flex-col gap-6">
	<h2 class="text-lg font-semibold tracking-tight text-foreground">
		{t.header_nav_distractions()}
	</h2>

	<DistractionRuleForm
		{windows}
		{editingRule}
		onSave={handleSave}
		onCancel={handleCancelEdit}
		{portalProps}
	/>

	{#if distractionState.rules.length > 0}
		<section aria-labelledby="distraction-rules-heading" class="flex flex-col gap-2">
			<h3
				id="distraction-rules-heading"
				class="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
			>
				{t.distraction_rules_heading()}
			</h3>
			<ul aria-labelledby="distraction-rules-heading" class="flex flex-col gap-1.5">
				{#each distractionState.rules as rule (rule.id)}
					<li
						class="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2"
					>
						<div class="flex min-w-0 items-center gap-2">
							<Badge variant="secondary">{rule.exe}</Badge>
							{#if rule.titlePattern}
								<span class="truncate text-xs text-muted-foreground">{rule.titlePattern}</span>
							{/if}
						</div>
						<div class="flex shrink-0 items-center gap-1">
							<Button
								variant="ghost"
								size="icon-xs"
								aria-label={t.distraction_rule_edit_aria({ exe: rule.exe })}
								onclick={() => handleEdit(rule)}
								class="text-muted-foreground/50 hover:text-foreground"
							>
								<Pencil class="size-3.5" />
							</Button>
							<Button
								variant="ghost"
								size="icon-xs"
								aria-label={t.distraction_rule_delete_aria({ exe: rule.exe })}
								onclick={() => handleDeleteRequest(rule)}
								class="text-muted-foreground/50 hover:bg-destructive/10 hover:text-destructive"
							>
								<Trash2 class="size-3.5" />
							</Button>
						</div>
					</li>
				{/each}
			</ul>
		</section>
	{:else if distractionState.isLoaded}
		<Empty.Root class="border border-dashed border-border/60">
			<Empty.Header>
				<Empty.Media variant="icon">
					<MousePointerClick />
				</Empty.Media>
				<Empty.Title class="text-base">{t.distraction_view_empty_title()}</Empty.Title>
				<Empty.Description>{t.distraction_view_empty_description()}</Empty.Description>
			</Empty.Header>
		</Empty.Root>
	{/if}

	{#if distractionState.silencedRules.length > 0}
		<section aria-labelledby="distraction-silenced-heading" class="flex flex-col gap-2">
			<h3
				id="distraction-silenced-heading"
				class="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
			>
				{t.distraction_silenced_heading()}
			</h3>
			<ul aria-labelledby="distraction-silenced-heading" class="flex flex-col gap-1.5">
				{#each distractionState.silencedRules as rule (rule.id)}
					<li
						class="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2"
					>
						<span class="truncate text-xs text-muted-foreground">{describeRule(rule)}</span>
						<Button
							variant="outline"
							size="sm"
							aria-label={t.distraction_silenced_release_aria({ exe: rule.exe })}
							onclick={() => distractionState.unsilenceRule(rule.id)}
						>
							{t.distraction_silenced_release()}
						</Button>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<!--
		The confirmation shell is the catalog's: it is already a generic
		title/description/variant dialog whose default labels are the generic
		"Confirm"/"Cancel" pair, and its open/cancel bookkeeping is covered by the break
		catalog tests. Duplicating it here would create a second copy to keep in sync.
	-->
	<BreakConfirmDialog
		bind:open={isDeleteOpen}
		title={t.distraction_rule_delete_confirm()}
		description={ruleToDelete ? describeRule(ruleToDelete) : ''}
		onConfirm={handleConfirmDelete}
		{portalProps}
	/>
</div>
