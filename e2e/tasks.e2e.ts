import { test, expect } from '@playwright/test';

test.describe('Focus Tasks & TaskPill Integration', () => {
	test('creates, switches, and reopens task-pill popover across navigation views', async ({
		page
	}) => {
		// 1. Visit Pomody root
		await page.goto('/');

		// 2. Initial state: Task pill displays "Free focus"
		const initialPill = page.getByRole('button', { name: 'Select focus task' });
		await expect(initialPill).toBeVisible();
		await expect(page.getByText('Free focus')).toBeVisible();

		// 3. Open popover and create a new task via quick-add input
		await initialPill.click();
		const quickInput = page.getByRole('textbox', { name: 'Create and pin new task' });
		await expect(quickInput).toBeVisible();

		await quickInput.fill('Architect E2E journey');
		await quickInput.press('Enter');

		// 4. Popover closes; pill updates to active task with an inline checkbox
		await expect(quickInput).not.toBeVisible();
		await expect(page.getByText('Architect E2E journey')).toBeVisible();
		const checkbox = page.getByRole('checkbox', {
			name: 'Mark "Architect E2E journey" as completed'
		});
		await expect(checkbox).toBeVisible();
		await expect(checkbox).toHaveAttribute('aria-checked', 'false');

		// 5. REGRESSION CHECK: Reopen popover on active task pill
		const activeTaskTrigger = page.getByRole('button', {
			name: 'Change active task: Architect E2E journey'
		});
		await activeTaskTrigger.click();
		await expect(quickInput).toBeVisible();

		// 6. Select "Free focus" to unassign task
		const freeFocusOption = page.getByRole('option', { name: /Free focus/i });
		await expect(freeFocusOption).toBeVisible();
		await freeFocusOption.click();

		// 7. Popover closes and pill reverts to "Free focus"
		await expect(quickInput).not.toBeVisible();
		await expect(page.getByText('Free focus')).toBeVisible();

		// 8. REGRESSION CHECK: Reopen popover from "Free focus" after unassigning
		await initialPill.click();
		await expect(quickInput).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(quickInput).not.toBeVisible();

		// 9. Navigate to Planning view
		const planningTab = page.getByRole('tab', { name: 'Planning' });
		await planningTab.click();
		await expect(page.getByRole('heading', { name: 'Planning' })).toBeVisible();
		await expect(page.getByText('Architect E2E journey')).toBeVisible();

		// 10. Navigate back to Timer view
		const timerTab = page.getByRole('tab', { name: 'Timer' });
		await timerTab.click();
		await expect(page.getByRole('timer')).toBeVisible();

		// 11. Re-assign task from the popover list
		await initialPill.click();
		const pendingOption = page.getByRole('option', { name: 'Architect E2E journey' });
		await expect(pendingOption).toBeVisible();
		await pendingOption.click();

		// 12. Complete the task in-place via checkbox
		await expect(activeTaskTrigger).toBeVisible();
		await checkbox.click();
		const completedCheckbox = page.getByRole('checkbox', {
			name: 'Mark "Architect E2E journey" as pending'
		});
		await expect(completedCheckbox).toBeVisible();
		await expect(completedCheckbox).toHaveAttribute('aria-checked', 'true');
		await expect(page.getByText('Architect E2E journey')).toHaveClass(/line-through/);
	});
});
