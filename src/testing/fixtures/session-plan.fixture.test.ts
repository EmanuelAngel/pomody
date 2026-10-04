import { describe, expect, it } from 'vitest';
import { createSessionPlanFixture } from '$tests/fixtures/session-plan.fixture';
import { DEFAULT_TIMER_CONFIG } from '$lib/domain/timer/timer-fsm';

describe('session-plan.fixture', () => {
	it('should create a session plan with default values', () => {
		const plan = createSessionPlanFixture();

		expect(plan.id).toBe('plan-fixture-1');
		expect(plan.targetMode).toBe('blocks');
		expect(plan.createdAt).toBe(1000);
		expect(plan.sessionConfig).toEqual(DEFAULT_TIMER_CONFIG);
		// 4 focus blocks + 3 breaks (short breaks since 1, 2, 3 < 4) = 7 blocks total
		expect(plan.blocks).toHaveLength(7);
		expect(plan.blocks[0].mode).toBe('focus');
		expect(plan.blocks[1].mode).toBe('shortBreak');
		expect(plan.blocks[2].mode).toBe('focus');
		expect(plan.blocks[3].mode).toBe('shortBreak');
		expect(plan.blocks[4].mode).toBe('focus');
		expect(plan.blocks[5].mode).toBe('shortBreak');
		expect(plan.blocks[6].mode).toBe('focus');

		expect(Object.isFrozen(plan)).toBe(true);
		expect(Object.isFrozen(plan.blocks)).toBe(true);
	});

	it('should apply partial overrides to session plan', () => {
		const plan = createSessionPlanFixture({
			id: 'custom-plan',
			blockCount: 2,
			createdAt: 3000,
			scheduledStartTimestamp: 10000
		});

		expect(plan.id).toBe('custom-plan');
		expect(plan.createdAt).toBe(3000);
		expect(plan.scheduledStartTimestamp).toBe(10000);
		expect(plan.targetEndTimestamp).toBeDefined();
		// 2 focus blocks + 1 short break = 3 blocks
		expect(plan.blocks).toHaveLength(3);
		expect(plan.blocks[0].mode).toBe('focus');
		expect(plan.blocks[1].mode).toBe('shortBreak');
		expect(plan.blocks[2].mode).toBe('focus');
		expect(Object.isFrozen(plan)).toBe(true);
	});

	it('should schedule long breaks when roundsBeforeLongBreak is reached', () => {
		const customConfig = {
			...DEFAULT_TIMER_CONFIG,
			roundsBeforeLongBreak: 2
		};

		const plan = createSessionPlanFixture({
			blockCount: 3,
			sessionConfig: customConfig
		});

		// Focus 1 -> Short Break -> Focus 2 -> Long Break (round 2 reached) -> Focus 3
		expect(plan.blocks).toHaveLength(5);
		expect(plan.blocks[0].mode).toBe('focus');
		expect(plan.blocks[1].mode).toBe('shortBreak');
		expect(plan.blocks[2].mode).toBe('focus');
		expect(plan.blocks[3].mode).toBe('longBreak');
		expect(plan.blocks[4].mode).toBe('focus');
	});
});
