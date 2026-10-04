import { describe, it, expect } from 'vitest';
import { FakeSessionPlanRepository } from '$tests/fakes/repositories/fake-session-plan-repository';
import type { SessionPlan } from '$lib/domain/planning/session-plan.entity';

describe('FakeSessionPlanRepository', () => {
	const samplePlan: SessionPlan = {
		id: 'plan-1',
		targetMode: 'blocks',
		blocks: [
			{
				index: 0,
				mode: 'focus',
				durationSeconds: 1500,
				status: 'pending'
			}
		],
		sessionConfig: {
			focusDurationSeconds: 1500,
			shortBreakDurationSeconds: 300,
			longBreakDurationSeconds: 900,
			roundsBeforeLongBreak: 4
		},
		createdAt: 1000,
		freeMarginSeconds: 0
	};

	it('initializes with null active plan by default', async () => {
		const repo = new FakeSessionPlanRepository();
		expect(await repo.getActivePlan()).toBeNull();
		expect(repo.getActivePlanCallCount).toBe(1);
	});

	it('initializes with provided active plan', async () => {
		const repo = new FakeSessionPlanRepository(samplePlan);
		expect(await repo.getActivePlan()).toEqual(samplePlan);
	});

	it('saves and updates the active plan', async () => {
		const repo = new FakeSessionPlanRepository();
		await repo.saveActivePlan(samplePlan);

		expect(repo.saveActivePlanCallCount).toBe(1);
		expect(await repo.getActivePlan()).toEqual(samplePlan);
	});

	it('clears the active plan', async () => {
		const repo = new FakeSessionPlanRepository(samplePlan);
		await repo.clearActivePlan();

		expect(repo.clearActivePlanCallCount).toBe(1);
		expect(await repo.getActivePlan()).toBeNull();
	});
});
