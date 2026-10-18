<script lang="ts">
	import { untrack } from 'svelte';
	import * as Field from '$lib/components/ui/field';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { t } from '$lib/state/locale.svelte';
	import {
		normalizeExe,
		type DistractionRule
	} from '$lib/domain/distraction/distraction-rule.entity';
	import type { OpenWindow } from '$lib/domain/ports/distraction-monitor.port';
	import type { DistractionRuleInput } from '$lib/state/distractionState.svelte';

	interface Props {
		/** Windows enumerated by the monitor, already read by the view. */
		windows?: readonly OpenWindow[];
		/** The rule being edited, or `null` when declaring a new one. */
		editingRule?: DistractionRule | null;
		onSave: (input: DistractionRuleInput) => boolean | Promise<boolean>;
		onCancel?: () => void;
		portalProps?: { disabled?: boolean };
	}

	let { windows = [], editingRule = null, onSave, onCancel, portalProps }: Props = $props();

	let exe = $state('');
	let titlePattern = $state('');
	/**
	 * `''` is the canonical "nothing picked" value for a bits-ui single-select listbox: its own
	 * `hasValue` is `value !== ""` and `toggleItem` writes `''` when it clears. An `undefined`
	 * value sits outside that branch, so the trigger can never fall back to the placeholder and
	 * the child keeps its stale selection.
	 */
	let pickedKey = $state('');
	let isSubmitting = $state(false);

	/**
	 * bits-ui resolves the trigger's label from this prop because the `Item` nodes live in a
	 * portal that unmounts when the list closes; without it the trigger falls back to the raw
	 * `value` (`"0"`, `"1"`) instead of the window label.
	 */
	const windowItems = $derived(
		windows.map((window, index) => ({
			value: String(index),
			label: `${window.title} — ${window.exe}`
		}))
	);

	/**
	 * Editing pre-fills both fields, and both stay editable afterwards: the picker is a
	 * convenience, never the authority (spec §6.1). `untrack` keeps this from re-running
	 * when the user types.
	 */
	$effect(() => {
		if (editingRule) {
			untrack(() => {
				exe = editingRule.exe;
				titlePattern = editingRule.titlePattern ?? '';
				pickedKey = '';
			});
		}
	});

	const canSubmit = $derived(normalizeExe(exe).length > 0);

	function handlePickChange(value: unknown) {
		if (typeof value !== 'string' || value === '') {
			return;
		}

		const picked = windows[Number(value)];
		if (picked === undefined) {
			return;
		}

		pickedKey = value;
		exe = picked.exe;
		titlePattern = picked.title;
	}

	/**
	 * The fields stay the authority (spec §6.1), so once they stop matching the picked window the
	 * picker drops back to the placeholder. That is also what keeps a later pick working: bits-ui
	 * early-returns on an already-selected item (`allowDeselect` is false), so a stale selection
	 * would swallow the click instead of re-filling the fields.
	 */
	function handleFieldsEdited() {
		pickedKey = '';
	}

	function reset() {
		exe = '';
		titlePattern = '';
		pickedKey = '';
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		if (!canSubmit || isSubmitting) {
			return;
		}

		isSubmitting = true;
		try {
			const saved = await onSave({
				...(editingRule?.id ? { id: editingRule.id } : {}),
				exe,
				...(titlePattern.trim().length > 0 ? { titlePattern: titlePattern.trim() } : {})
			});

			if (saved) {
				reset();
			}
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		reset();
		onCancel?.();
	}
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-4">
	<Field.FieldGroup class="gap-4">
		{#if windows.length > 0}
			<Field.Field class="gap-1.5">
				<Field.FieldLabel
					for="distraction-window-picker"
					class="text-xs font-medium text-foreground"
				>
					{t.distraction_rule_picker_label()}
				</Field.FieldLabel>
				<!--
					`type="single"` is load-bearing: an unset `type` makes bits-ui answer with an
					array value (multi-select semantics) and `onValueChange` then emits `string[]`,
					so the picker would silently never pre-fill anything.
				-->
				<Select.Root
					type="single"
					value={pickedKey}
					onValueChange={handlePickChange}
					items={windowItems}
				>
					<Select.Trigger id="distraction-window-picker" size="sm" class="w-full">
						<Select.Value placeholder={t.distraction_rule_picker_placeholder()} />
					</Select.Trigger>
					<Select.Content {portalProps}>
						<Select.Group>
							{#each windowItems as item (item.value)}
								<Select.Item value={item.value} label={item.label}>
									{item.label}
								</Select.Item>
							{/each}
						</Select.Group>
					</Select.Content>
				</Select.Root>
			</Field.Field>
		{:else}
			<p class="text-xs text-muted-foreground">{t.distraction_rule_picker_empty()}</p>
		{/if}

		<Field.Field class="gap-1.5">
			<Field.FieldLabel for="distraction-rule-exe" class="text-xs font-medium text-foreground">
				{t.distraction_rule_exe_label()}
			</Field.FieldLabel>
			<Input
				id="distraction-rule-exe"
				type="text"
				placeholder={t.distraction_rule_exe_placeholder()}
				bind:value={exe}
				oninput={handleFieldsEdited}
			/>
		</Field.Field>

		<Field.Field class="gap-1.5">
			<Field.FieldLabel
				for="distraction-rule-title-pattern"
				class="text-xs font-medium text-foreground"
			>
				{t.distraction_rule_title_pattern_label()}
			</Field.FieldLabel>
			<Input
				id="distraction-rule-title-pattern"
				type="text"
				bind:value={titlePattern}
				oninput={handleFieldsEdited}
			/>
			<Field.FieldDescription class="text-xs text-muted-foreground">
				{t.distraction_rule_title_pattern_hint()}
			</Field.FieldDescription>
		</Field.Field>
	</Field.FieldGroup>

	<div class="flex items-center justify-end gap-2">
		{#if editingRule}
			<Button type="button" variant="outline" size="sm" onclick={handleCancel}>
				{t.distraction_rule_cancel()}
			</Button>
		{/if}
		<Button type="submit" size="sm" disabled={!canSubmit || isSubmitting}>
			{editingRule ? t.distraction_rule_save() : t.distraction_rule_add()}
		</Button>
	</div>
</form>
