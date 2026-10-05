<script lang="ts">
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { t } from '$lib/state/locale.svelte';

	interface Props {
		open?: boolean;
		title: string;
		description: string;
		confirmLabel?: string;
		cancelLabel?: string;
		variant?: 'destructive' | 'default';
		onConfirm: () => void | Promise<void>;
		onCancel?: () => void;
		portalProps?: { disabled?: boolean };
	}

	let {
		open = $bindable(false),
		title,
		description,
		confirmLabel,
		cancelLabel,
		variant = 'destructive',
		onConfirm,
		onCancel,
		portalProps
	}: Props = $props();

	const resolvedConfirmLabel = $derived(confirmLabel ?? t.break_confirm_dialog_confirm_default());
	const resolvedCancelLabel = $derived(cancelLabel ?? t.break_confirm_dialog_cancel_default());

	let isClosedByAction = false;

	async function handleConfirm() {
		isClosedByAction = true;
		await onConfirm();
		open = false;
	}

	function handleCancel() {
		isClosedByAction = true;
		onCancel?.();
	}

	function handleOpenChange(nextOpen: boolean) {
		if (!nextOpen && !isClosedByAction) {
			onCancel?.();
		}
		if (nextOpen) {
			isClosedByAction = false;
		}
		open = nextOpen;
	}
</script>

<AlertDialog.Root bind:open onOpenChange={handleOpenChange}>
	<AlertDialog.Content {portalProps}>
		<AlertDialog.Header>
			<AlertDialog.Title>{title}</AlertDialog.Title>
			<AlertDialog.Description>{description}</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel onclick={handleCancel}>
				{resolvedCancelLabel}
			</AlertDialog.Cancel>
			<AlertDialog.Action {variant} onclick={handleConfirm}>
				{resolvedConfirmLabel}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
