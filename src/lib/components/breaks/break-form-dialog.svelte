<script lang="ts">
	import { untrack } from 'svelte';
	import Activity from '@lucide/svelte/icons/activity';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Droplet from '@lucide/svelte/icons/droplet';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Field from '$lib/components/ui/field';
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { cn } from '$lib/utils';
	import {
		type BreakActivity,
		type BreakCategory,
		BREAK_ACTIVITY_TITLE_MAX_LENGTH,
		BREAK_ACTIVITY_GUIDE_MAX_LENGTH
	} from '$lib/domain/breaks/break-activity.entity';

	interface Props {
		open?: boolean;
		activity?: BreakActivity | null;
		onSave: (payload: {
			id?: string;
			title: string;
			category: BreakCategory;
			durationMinutes: number;
			guide?: string;
			isPreset: boolean;
		}) => void | Promise<void>;
		onCancel?: () => void;
		portalProps?: { disabled?: boolean };
	}

	let { open = $bindable(false), activity = null, onSave, onCancel, portalProps }: Props = $props();

	let title = $state('');
	let category = $state<BreakCategory>('physical');
	let durationMinutes = $state(5);
	let guide = $state('');

	let touchedTitle = $state(false);
	let touchedDuration = $state(false);
	let touchedGuide = $state(false);
	let hasSubmitted = $state(false);
	let isSubmitting = $state(false);
	let isClosedByAction = false;

	$effect(() => {
		if (open) {
			untrack(() => {
				if (activity) {
					title = activity.title;
					category = activity.category;
					durationMinutes = activity.durationMinutes;
					guide = activity.guide ?? '';
				} else {
					title = '';
					category = 'physical';
					durationMinutes = 5;
					guide = '';
				}
				touchedTitle = false;
				touchedDuration = false;
				touchedGuide = false;
				hasSubmitted = false;
				isSubmitting = false;
				isClosedByAction = false;
			});
		}
	});

	const titleTrimmed = $derived(title.trim());

	const titleError = $derived.by(() => {
		if (titleTrimmed.length === 0) {
			return 'Title is required.';
		}
		if (titleTrimmed.length > BREAK_ACTIVITY_TITLE_MAX_LENGTH) {
			return `Title cannot exceed ${BREAK_ACTIVITY_TITLE_MAX_LENGTH} characters.`;
		}
		return null;
	});

	const parsedDuration = $derived.by(() => {
		if (typeof durationMinutes === 'number') {
			return durationMinutes;
		}
		const parsed = Number(durationMinutes);
		return isNaN(parsed) ? 0 : parsed;
	});

	const durationError = $derived.by(() => {
		if (
			typeof parsedDuration !== 'number' ||
			!Number.isInteger(parsedDuration) ||
			parsedDuration < 1
		) {
			return 'Duration must be at least 1 minute.';
		}
		return null;
	});

	const guideError = $derived.by(() => {
		if (guide.length > BREAK_ACTIVITY_GUIDE_MAX_LENGTH) {
			return `Guide cannot exceed ${BREAK_ACTIVITY_GUIDE_MAX_LENGTH} characters.`;
		}
		return null;
	});

	const isValid = $derived(titleError === null && durationError === null && guideError === null);

	const showTitleError = $derived(titleError !== null && (touchedTitle || hasSubmitted));
	const showDurationError = $derived(durationError !== null && (touchedDuration || hasSubmitted));
	const showGuideError = $derived(guideError !== null && (touchedGuide || hasSubmitted));

	async function handleSubmit(e?: SubmitEvent) {
		e?.preventDefault();
		hasSubmitted = true;
		touchedTitle = true;
		touchedDuration = true;
		touchedGuide = true;

		if (!isValid || isSubmitting) {
			return;
		}

		isSubmitting = true;
		try {
			await onSave({
				...(activity?.id ? { id: activity.id } : {}),
				title: titleTrimmed,
				category,
				durationMinutes: parsedDuration,
				...(guide.trim().length > 0 ? { guide: guide.trim() } : {}),
				isPreset: activity?.isPreset ?? false
			});
			isClosedByAction = true;
			open = false;
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		isClosedByAction = true;
		onCancel?.();
		open = false;
	}

	function handleOpenChange(nextOpen: boolean) {
		if (!nextOpen && !isClosedByAction && !isSubmitting) {
			onCancel?.();
		}
		if (nextOpen) {
			isClosedByAction = false;
		}
		open = nextOpen;
	}
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
	<Dialog.Content {portalProps} class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title class="text-base font-semibold text-foreground">
				{activity ? 'Edit Break Habit' : 'New Break Habit'}
			</Dialog.Title>
			<Dialog.Description class="text-xs text-muted-foreground">
				{activity
					? 'Modify custom habit details and micro-guide instructions.'
					: 'Add a custom restorative habit with duration and optional guidance.'}
			</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={handleSubmit} class="flex flex-col gap-4">
			<Field.FieldGroup class="gap-4">
				<!-- Title Field -->
				<Field.Field data-invalid={showTitleError || undefined} class="gap-1.5">
					<div class="flex items-center justify-between">
						<Field.FieldLabel for="habit-title" class="text-xs font-medium text-foreground">
							Title <span class="text-destructive">*</span>
						</Field.FieldLabel>
						<span
							class={cn(
								'text-[11px] tabular-nums',
								title.length > BREAK_ACTIVITY_TITLE_MAX_LENGTH
									? 'font-semibold text-destructive'
									: 'text-muted-foreground'
							)}
						>
							{title.length}/{BREAK_ACTIVITY_TITLE_MAX_LENGTH}
						</span>
					</div>
					<Input
						id="habit-title"
						type="text"
						placeholder="e.g. Upper Back Stretch"
						bind:value={title}
						oninput={() => (touchedTitle = true)}
						aria-invalid={showTitleError}
						aria-describedby={showTitleError ? 'habit-title-error' : undefined}
					/>
					{#if showTitleError}
						<Field.FieldDescription id="habit-title-error" class="text-xs text-destructive">
							{titleError}
						</Field.FieldDescription>
					{/if}
				</Field.Field>

				<!-- Category Field -->
				<Field.Field class="gap-1.5">
					<Field.FieldLabel id="habit-category-label" class="text-xs font-medium text-foreground">
						Category <span class="text-destructive">*</span>
					</Field.FieldLabel>
					<ToggleGroup.Root
						type="single"
						value={category}
						onValueChange={(val) => {
							if (val === 'physical' || val === 'mindful' || val === 'hydration') {
								category = val;
							}
						}}
						aria-labelledby="habit-category-label"
						variant="outline"
						spacing={2}
						class="flex flex-wrap"
					>
						<ToggleGroup.Item
							value="physical"
							aria-label="Physical"
							class="data-[state=on]:border-accent-gold/60 data-[state=on]:bg-accent-gold/20 data-[state=on]:text-accent-gold"
						>
							<Activity data-icon="inline-start" />
							<span>Physical</span>
						</ToggleGroup.Item>
						<ToggleGroup.Item
							value="mindful"
							aria-label="Mindful"
							class="data-[state=on]:border-accent-iris/60 data-[state=on]:bg-accent-iris/20 data-[state=on]:text-accent-iris"
						>
							<Sparkles data-icon="inline-start" />
							<span>Mindful</span>
						</ToggleGroup.Item>
						<ToggleGroup.Item
							value="hydration"
							aria-label="Hydration"
							class="data-[state=on]:border-accent-foam/60 data-[state=on]:bg-accent-foam/20 data-[state=on]:text-accent-foam"
						>
							<Droplet data-icon="inline-start" />
							<span>Hydration</span>
						</ToggleGroup.Item>
					</ToggleGroup.Root>
				</Field.Field>

				<!-- Duration Field -->
				<Field.Field data-invalid={showDurationError || undefined} class="gap-1.5">
					<Field.FieldLabel for="habit-duration" class="text-xs font-medium text-foreground">
						Duration (minutes) <span class="text-destructive">*</span>
					</Field.FieldLabel>
					<Input
						id="habit-duration"
						type="number"
						min="1"
						step="1"
						bind:value={durationMinutes}
						oninput={() => (touchedDuration = true)}
						aria-invalid={showDurationError}
						aria-describedby={showDurationError ? 'habit-duration-error' : undefined}
					/>
					{#if showDurationError}
						<Field.FieldDescription id="habit-duration-error" class="text-xs text-destructive">
							{durationError}
						</Field.FieldDescription>
					{/if}
				</Field.Field>

				<!-- Micro-Guide Field -->
				<Field.Field data-invalid={showGuideError || undefined} class="gap-1.5">
					<div class="flex items-center justify-between">
						<Field.FieldLabel for="habit-guide" class="text-xs font-medium text-foreground">
							Micro-Guide <span class="font-normal text-muted-foreground">(Optional)</span>
						</Field.FieldLabel>
						<span
							class={cn(
								'text-[11px] tabular-nums',
								guide.length > BREAK_ACTIVITY_GUIDE_MAX_LENGTH
									? 'font-semibold text-destructive'
									: 'text-muted-foreground'
							)}
						>
							{guide.length}/{BREAK_ACTIVITY_GUIDE_MAX_LENGTH}
						</span>
					</div>
					<Textarea
						id="habit-guide"
						rows={3}
						placeholder="1. Step one...&#10;2. Step two...&#10;3. Step three..."
						bind:value={guide}
						oninput={() => (touchedGuide = true)}
						aria-invalid={showGuideError}
						aria-describedby={showGuideError ? 'habit-guide-error' : undefined}
						class="min-h-20"
					/>
					{#if showGuideError}
						<Field.FieldDescription id="habit-guide-error" class="text-xs text-destructive">
							{guideError}
						</Field.FieldDescription>
					{/if}
				</Field.Field>
			</Field.FieldGroup>

			<!-- Action Buttons -->
			<Dialog.Footer class="flex flex-row justify-end gap-2 pt-2">
				<Button type="button" variant="outline" onclick={handleCancel} disabled={isSubmitting}>
					Cancel
				</Button>
				<Button type="submit" disabled={!isValid || isSubmitting}>
					{activity ? 'Save Changes' : 'Create Habit'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
