<script lang="ts">
	import { untrack } from 'svelte';
	import { Dialog } from 'bits-ui';
	import X from '@lucide/svelte/icons/x';
	import Activity from '@lucide/svelte/icons/activity';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Droplet from '@lucide/svelte/icons/droplet';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { cn } from '$lib/utils';
	import {
		type BreakActivity,
		type BreakCategory,
		VALID_BREAK_CATEGORIES,
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
	<Dialog.Portal {...portalProps}>
		<Dialog.Overlay
			class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
		/>
		<Dialog.Content
			class="fixed top-1/2 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border/60 bg-popover p-6 text-popover-foreground shadow-xl duration-150 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
		>
			<div class="flex items-center justify-between pb-3">
				<div>
					<Dialog.Title class="text-base font-semibold text-foreground">
						{activity ? 'Edit Break Habit' : 'New Break Habit'}
					</Dialog.Title>
					<Dialog.Description class="mt-0.5 text-xs text-muted-foreground">
						{activity
							? 'Modify custom habit details and micro-guide instructions.'
							: 'Add a custom restorative habit with duration and optional guidance.'}
					</Dialog.Description>
				</div>
				<button
					type="button"
					aria-label="Close dialog"
					onclick={handleCancel}
					class="cursor-pointer rounded-md p-1 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
				>
					<X class="size-4" />
				</button>
			</div>

			<form onsubmit={handleSubmit} class="space-y-4">
				<!-- Title Field -->
				<div class="space-y-1.5">
					<div class="flex items-center justify-between">
						<label for="habit-title" class="text-xs font-medium text-foreground">
							Title <span class="text-destructive">*</span>
						</label>
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
						onblur={() => (touchedTitle = true)}
						aria-invalid={showTitleError}
						aria-describedby={showTitleError ? 'habit-title-error' : undefined}
					/>
					{#if showTitleError}
						<p id="habit-title-error" class="text-xs text-destructive">
							{titleError}
						</p>
					{/if}
				</div>

				<!-- Category Field -->
				<div class="space-y-1.5">
					<span id="habit-category-label" class="text-xs font-medium text-foreground">
						Category <span class="text-destructive">*</span>
					</span>
					<div
						role="radiogroup"
						aria-labelledby="habit-category-label"
						class="flex flex-wrap gap-2"
					>
						{#each VALID_BREAK_CATEGORIES as cat (cat)}
							<button
								type="button"
								role="radio"
								aria-checked={category === cat}
								onclick={() => (category = cat)}
								class={cn(
									'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all select-none',
									category === cat
										? cat === 'physical'
											? 'border-accent-gold/60 bg-accent-gold/20 font-semibold text-accent-gold shadow-xs ring-1 ring-accent-gold/40'
											: cat === 'mindful'
												? 'border-accent-iris/60 bg-accent-iris/20 font-semibold text-accent-iris shadow-xs ring-1 ring-accent-iris/40'
												: 'border-accent-foam/60 bg-accent-foam/20 font-semibold text-accent-foam shadow-xs ring-1 ring-accent-foam/40'
										: 'border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground'
								)}
							>
								{#if cat === 'physical'}
									<Activity class="size-3.5 shrink-0" />
									<span>Physical</span>
								{:else if cat === 'mindful'}
									<Sparkles class="size-3.5 shrink-0" />
									<span>Mindful</span>
								{:else if cat === 'hydration'}
									<Droplet class="size-3.5 shrink-0" />
									<span>Hydration</span>
								{/if}
							</button>
						{/each}
					</div>
				</div>

				<!-- Duration Field -->
				<div class="space-y-1.5">
					<label for="habit-duration" class="text-xs font-medium text-foreground">
						Duration (minutes) <span class="text-destructive">*</span>
					</label>
					<Input
						id="habit-duration"
						type="number"
						min="1"
						step="1"
						bind:value={durationMinutes}
						oninput={() => (touchedDuration = true)}
						onblur={() => (touchedDuration = true)}
						aria-invalid={showDurationError}
						aria-describedby={showDurationError ? 'habit-duration-error' : undefined}
					/>
					{#if showDurationError}
						<p id="habit-duration-error" class="text-xs text-destructive">
							{durationError}
						</p>
					{/if}
				</div>

				<!-- Micro-Guide Field -->
				<div class="space-y-1.5">
					<div class="flex items-center justify-between">
						<label for="habit-guide" class="text-xs font-medium text-foreground">
							Micro-Guide <span class="font-normal text-muted-foreground">(Optional)</span>
						</label>
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
					<textarea
						id="habit-guide"
						rows="3"
						placeholder="1. Step one...&#10;2. Step two...&#10;3. Step three..."
						bind:value={guide}
						oninput={() => (touchedGuide = true)}
						onblur={() => (touchedGuide = true)}
						aria-invalid={showGuideError}
						aria-describedby={showGuideError ? 'habit-guide-error' : undefined}
						class="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
					></textarea>
					{#if showGuideError}
						<p id="habit-guide-error" class="text-xs text-destructive">
							{guideError}
						</p>
					{/if}
				</div>

				<!-- Action Buttons -->
				<div class="flex items-center justify-end gap-2 pt-2">
					<Button type="button" variant="outline" onclick={handleCancel} disabled={isSubmitting}>
						Cancel
					</Button>
					<Button type="submit" disabled={!isValid || isSubmitting}>
						{activity ? 'Save Changes' : 'Create Habit'}
					</Button>
				</div>
			</form>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
