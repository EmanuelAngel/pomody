import { test, expect } from '@playwright/test';

test.describe('Session Planning & Timeline Projection Journey', () => {
	test('configures session plan, slots task, launches session, and synchronizes with timer', async ({
		page
	}) => {
		// 1. Visit Pomody root
		await page.goto('/');
		await expect(page.getByRole('timer')).toBeVisible();

		// 2. Navigate to Planning view
		const planningTab = page.getByRole('tab', { name: 'Planning' });
		await planningTab.click();
		await expect(page.getByRole('heading', { name: 'Planning' })).toBeVisible();

		// 3. Create a task in the backlog
		const taskInput = page.getByRole('textbox', {
			name: 'Add a new focus task... (Enter to add)'
		});
		await expect(taskInput).toBeVisible();
		await taskInput.fill('Feature Planning E2E');
		await taskInput.press('Enter');
		await expect(page.getByText('Feature Planning E2E')).toBeVisible();

		// 4. Verify initial timeline metrics in By Blocks mode
		await expect(page.getByText('Session Timeline')).toBeVisible();
		await expect(page.getByRole('button', { name: 'By Blocks' })).toBeVisible();
		await expect(page.getByText('Total Focus')).toBeVisible();
		await expect(page.getByText('Total Breaks')).toBeVisible();

		// 5. Test mode switching to By End Time
		const byEndTimeButton = page.getByRole('button', { name: 'By End Time' });
		await byEndTimeButton.click();
		await expect(page.getByLabel('Target finish time')).toBeVisible();

		// 6. Switch back to By Blocks mode
		const byBlocksButton = page.getByRole('button', { name: 'By Blocks' });
		await byBlocksButton.click();

		// 7. Slot the task into Block 1 via the timeline Popover picker
		const assignTrigger = page.getByRole('button', { name: 'Assign task to focus block 1' });
		await expect(assignTrigger).toBeVisible();
		await assignTrigger.click();

		const taskOption = page.getByRole('button', {
			name: 'Assign task: Feature Planning E2E'
		});
		await expect(taskOption).toBeVisible();
		await taskOption.click();

		// Verify task title is slotted in Block 1
		const timelineSection = page.getByRole('region', { name: 'Session Planning' });
		await expect(timelineSection.getByText('Feature Planning E2E')).toBeVisible();
		await expect(
			timelineSection.getByRole('button', { name: 'Unassign task from focus block 1' })
		).toBeVisible();

		// 8. Launch session via Start Session CTA
		const startSessionButton = timelineSection.getByRole('button', { name: 'Start Session' });
		await expect(startSessionButton).toBeVisible();
		await startSessionButton.click();

		// 9. Verify navigation to Timer tab and active task pill
		await expect(page.getByRole('timer')).toBeVisible();
		await expect(page.getByRole('button', { name: /Feature Planning E2E/i })).toBeVisible();

		// Pause timer to exit zen mode and reveal header
		const pauseButton = page.getByRole('button', { name: 'Pause timer' });
		await expect(pauseButton).toBeVisible();
		await pauseButton.click();

		// 10. Navigate back to Planning tab to verify active session lock
		await planningTab.click();
		await expect(timelineSection.getByText('Active block', { exact: true })).toBeVisible();
		await expect(timelineSection.getByRole('button', { name: 'Back to timer' })).toBeVisible();
		const endPlanButton = timelineSection.getByRole('button', { name: 'End Session Plan' });
		await expect(endPlanButton).toBeVisible();

		// 11. End session plan
		await endPlanButton.click();
		await expect(timelineSection.getByRole('button', { name: 'Start Session' })).toBeVisible();
	});
});
