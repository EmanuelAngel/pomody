import { test, expect, type Page } from '@playwright/test';

const RUNNING_TITLE = /^\d{2}:\d{2} Focus — Pomody$/;

function remainingSecondsFromTitle(title: string): number {
	const match = title.match(/^(\d{2}):(\d{2})\s/);
	if (!match) {
		throw new Error(`Unexpected document title: ${title}`);
	}
	return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * Starts a session with a single task assigned to the first focus block.
 * Mirrors the real journey: the timer starts running from the Planning view.
 */
async function startSessionWithTask(page: Page, title: string): Promise<void> {
	await page.goto('/');
	await expect(page.getByRole('timer')).toBeVisible();

	await page.getByRole('tab', { name: 'Planning' }).click();
	const taskInput = page.getByRole('textbox', { name: /Add a new focus task/i });
	await expect(taskInput).toBeVisible();
	await taskInput.fill(title);
	await taskInput.press('Enter');
	await expect(page.getByText(title)).toBeVisible();

	await page.getByRole('button', { name: 'Assign task to focus block 1' }).click();
	await page.getByRole('button', { name: `Assign task: ${title}` }).click();

	const timeline = page.getByRole('region', { name: 'Session Planning' });
	await timeline.getByRole('button', { name: 'Start Session' }).click();

	await expect(page.getByRole('timer')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Pause timer' })).toBeVisible();
}

test.describe('Timer persistence across reloads', () => {
	test('a running block resumes after a reload with the session and task restored', async ({
		page
	}) => {
		await startSessionWithTask(page, 'Reload running journey');
		await expect(page).toHaveTitle(RUNNING_TITLE);

		await page.waitForTimeout(1500);
		const before = remainingSecondsFromTitle(await page.title());

		await page.reload();

		await expect(page).toHaveTitle(RUNNING_TITLE);
		const after = remainingSecondsFromTitle(await page.title());

		expect(Math.abs(before - after)).toBeLessThanOrEqual(2);
		await expect(page.getByRole('button', { name: 'Pause timer' })).toBeVisible();
		await expect(page.getByRole('button', { name: /Reload running journey/i })).toBeVisible();

		const planStatus = await page.evaluate(() => {
			const raw = window.localStorage.getItem('pomody:session-plan');
			if (!raw) return null;
			const envelope = JSON.parse(raw) as { plan: { blocks: Array<{ status: string }> } };
			return envelope.plan.blocks[0]?.status ?? null;
		});
		expect(planStatus).toBe('in_progress');
	});

	test('a block that expired while the app was closed is discarded and the plan block stays in progress', async ({
		page
	}) => {
		await startSessionWithTask(page, 'Expired journey');
		await page.getByRole('button', { name: 'Pause timer' }).click();

		await page.evaluate(() => {
			const raw = window.localStorage.getItem('pomody:timer-state');
			if (!raw) {
				throw new Error('The timer snapshot was not persisted');
			}
			const envelope = JSON.parse(raw) as { snapshot: Record<string, unknown> };
			envelope.snapshot.state = 'running';
			envelope.snapshot.endsAt = Date.now() - 5_000;
			delete envelope.snapshot.remainingMs;
			window.localStorage.setItem('pomody:timer-state', JSON.stringify(envelope));
		});

		await page.reload();

		await expect(page).toHaveTitle('Pomody — Minimalist Focus Timer');
		await expect(page.getByRole('timer')).toHaveAccessibleName('Time remaining: 25:00');
		await expect(page.getByRole('button', { name: 'Start timer' })).toBeVisible();

		const planStatus = await page.evaluate(() => {
			const raw = window.localStorage.getItem('pomody:session-plan');
			if (!raw) return null;
			const envelope = JSON.parse(raw) as { plan: { blocks: Array<{ status: string }> } };
			return envelope.plan.blocks[0]?.status ?? null;
		});
		expect(planStatus).toBe('in_progress');
	});

	test('ending the session clears the persisted timer and reloading starts clean', async ({
		page
	}) => {
		await startSessionWithTask(page, 'End session journey');
		await page.getByRole('button', { name: 'Pause timer' }).click();

		await page.getByRole('tab', { name: 'Planning' }).click();
		await page.getByRole('button', { name: 'End Session Plan' }).click();
		await page.getByRole('button', { name: 'End Session', exact: true }).click();

		const keys = await page.evaluate(() => ({
			plan: window.localStorage.getItem('pomody:session-plan'),
			timer: window.localStorage.getItem('pomody:timer-state')
		}));
		expect(keys.plan).toBeNull();
		expect(keys.timer).toBeNull();

		await page.reload();

		await expect(page).toHaveTitle('Pomody — Minimalist Focus Timer');
		await expect(page.getByRole('timer')).toHaveAccessibleName('Time remaining: 25:00');
		await expect(page.getByRole('button', { name: 'Start timer' })).toBeVisible();
		await expect(page.getByRole('button', { name: /End session journey/i })).toHaveCount(0);
	});
});
