<script lang="ts">
	import * as AlertDialog from '$lib/components/ui/alert-dialog';

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
		confirmLabel = 'Confirm',
		cancelLabel = 'Cancel',
		variant = 'destructive',
		onConfirm,
		onCancel,
		portalProps
	}: Props = $props();

	let isProcessing = $state(false);
	let isClosedByAction = false;

	async function handleConfirm() {
		isProcessing = true;
		isClosedByAction = true;
		try {
			await onConfirm();
			isProcessing = false;
			open = false;
		} catch (error) {
			isProcessing = false;
			throw error;
		}
	}

	function handleCancel() {
		isClosedByAction = true;
		onCancel?.();
		open = false;
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
			<AlertDialog.Cancel onclick={handleCancel} disabled={isProcessing}>
				{cancelLabel}
			</AlertDialog.Cancel>
			<AlertDialog.Action {variant} onclick={handleConfirm} disabled={isProcessing}>
				{confirmLabel}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
