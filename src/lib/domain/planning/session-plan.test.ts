import { describe, it, expect } from 'vitest';
import {
	type PlanTargetMode,
	type PlanBlock,
	InvalidSessionPlanError,
	PlanBlockNotFoundError,
	InvalidPlanOperationError,
	generatePlanId,
	calculateSessionBudgetByBlocks,
	calculateSessionBudgetByEndTime,
	assignTaskToBlock,
	unassignTaskFromBlock,
	assignBreakActivityToBlock,
	unassignBreakActivityFromBlock,
	updateBlockStatus,
	validateSessionPlan
} from './session-plan.entity';
import type { TimerConfig } from '../timer/timer-fsm';

describe('SessionPlan Domain Entity', () => {
	const testConfig: TimerConfig = {
		focusDurationSeconds: 1500, // 25 min
		shortBreakDurationSeconds: 300, // 5 min
		longBreakDurationSeconds: 900, // 15 min
		roundsBeforeLongBreak: 4
	};

	describe('generatePlanId', () => {
		it('generates a valid RFC 4122 v4 UUID string in standard environment', () => {
			const id = generatePlanId();
			expect(typeof id).toBe('string');
			expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
		});

		it('falls back to pseudo-random UUID v4 when crypto.randomUUID is unavailable', () => {
			const originalRandomUUID = crypto.randomUUID;
			try {
				// @ts-expect-error mutating for testing fallback
				delete crypto.randomUUID;
				const id = generatePlanId();
				expect(typeof id).toBe('string');
				expect(id).toMatch(
					/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
				);
			} finally {
				crypto.randomUUID = originalRandomUUID;
			}
		});
	});

	describe('calculateSessionBudgetByBlocks', () => {
		it('calculates plan for 1 focus block with zero breaks and strictly ends on focus', () => {
			const plan = calculateSessionBudgetByBlocks({
				blockCount: 1,
				sessionConfig: testConfig,
				scheduledStartTimestamp: 10000
			});

			expect(plan.targetMode).toBe('blocks');
			expect(plan.blocks).toHaveLength(1);
			expect(plan.blocks[0]).toEqual({
				index: 0,
				mode: 'focus',
				durationSeconds: 1500,
				status: 'pending'
			});
			expect(plan.freeMarginSeconds).toBe(0);
			expect(plan.scheduledStartTimestamp).toBe(10000);
			expect(plan.targetEndTimestamp).toBe(10000 + 1500 * 1000);
		});

		it('calculates plan for 2 focus blocks alternating with 1 short break', () => {
			const plan = calculateSessionBudgetByBlocks({
				blockCount: 2,
				sessionConfig: testConfig
			});

			expect(plan.blocks).toHaveLength(3);
			expect(plan.blocks[0]).toMatchObject({ index: 0, mode: 'focus', durationSeconds: 1500 });
			expect(plan.blocks[1]).toMatchObject({ index: 1, mode: 'shortBreak', durationSeconds: 300 });
			expect(plan.blocks[2]).toMatchObject({ index: 2, mode: 'focus', durationSeconds: 1500 });
			expect(plan.targetEndTimestamp).toBeUndefined();
		});

		it('calculates plan for 4 focus blocks with 3 short breaks (terminal focus block, no trailing break)', () => {
			const plan = calculateSessionBudgetByBlocks({
				blockCount: 4,
				sessionConfig: testConfig
			});

			// 4 focus + 3 breaks = 7 blocks
			expect(plan.blocks).toHaveLength(7);
			expect(plan.blocks[0].mode).toBe('focus');
			expect(plan.blocks[1].mode).toBe('shortBreak');
			expect(plan.blocks[2].mode).toBe('focus');
			expect(plan.blocks[3].mode).toBe('shortBreak');
			expect(plan.blocks[4].mode).toBe('focus');
			expect(plan.blocks[5].mode).toBe('shortBreak');
			expect(plan.blocks[6].mode).toBe('focus');
			expect(plan.blocks[6].index).toBe(6);
			expect(plan.freeMarginSeconds).toBe(0);
		});

		it('triggers a longBreak milestone after sessionConfig.roundsBeforeLongBreak rounds', () => {
			// 5 focus blocks with roundsBeforeLongBreak = 4
			const plan = calculateSessionBudgetByBlocks({
				blockCount: 5,
				sessionConfig: testConfig
			});

			// 5 focus + 4 breaks = 9 blocks
			expect(plan.blocks).toHaveLength(9);
			// Round 1 break: shortBreak
			expect(plan.blocks[1].mode).toBe('shortBreak');
			expect(plan.blocks[1].durationSeconds).toBe(300);
			// Round 2 break: shortBreak
			expect(plan.blocks[3].mode).toBe('shortBreak');
			// Round 3 break: shortBreak
			expect(plan.blocks[5].mode).toBe('shortBreak');
			// Round 4 break: longBreak (after round 4 focus)
			expect(plan.blocks[7].mode).toBe('longBreak');
			expect(plan.blocks[7].durationSeconds).toBe(900);
			// Round 5: focus
			expect(plan.blocks[8].mode).toBe('focus');
		});

		it('supports customized roundsBeforeLongBreak = 2', () => {
			const config: TimerConfig = {
				...testConfig,
				roundsBeforeLongBreak: 2
			};
			const plan = calculateSessionBudgetByBlocks({
				blockCount: 4,
				sessionConfig: config
			});

			// Round 1 -> shortBreak (index 1)
			expect(plan.blocks[1].mode).toBe('shortBreak');
			// Round 2 -> longBreak (index 3)
			expect(plan.blocks[3].mode).toBe('longBreak');
			// Round 3 -> shortBreak (index 5)
			expect(plan.blocks[5].mode).toBe('shortBreak');
			// Round 4 -> final focus (index 6)
			expect(plan.blocks[6].mode).toBe('focus');
		});

		it('uses provided custom id and createdAt when passed', () => {
			const plan = calculateSessionBudgetByBlocks({
				blockCount: 1,
				sessionConfig: testConfig,
				id: 'custom-plan-id',
				createdAt: 123456789
			});

			expect(plan.id).toBe('custom-plan-id');
			expect(plan.createdAt).toBe(123456789);
		});

		it('throws InvalidSessionPlanError on invalid blockCount', () => {
			expect(() =>
				calculateSessionBudgetByBlocks({ blockCount: 0, sessionConfig: testConfig })
			).toThrow(InvalidSessionPlanError);

			expect(() =>
				calculateSessionBudgetByBlocks({ blockCount: -2, sessionConfig: testConfig })
			).toThrow(InvalidSessionPlanError);

			expect(() =>
				calculateSessionBudgetByBlocks({ blockCount: 2.5, sessionConfig: testConfig })
			).toThrow(InvalidSessionPlanError);

			expect(() =>
				calculateSessionBudgetByBlocks({
					// @ts-expect-error testing invalid type
					blockCount: 'three',
					sessionConfig: testConfig
				})
			).toThrow(InvalidSessionPlanError);
		});

		it('throws InvalidSessionPlanError on non-finite scheduledStartTimestamp', () => {
			expect(() =>
				calculateSessionBudgetByBlocks({
					blockCount: 2,
					sessionConfig: testConfig,
					scheduledStartTimestamp: NaN
				})
			).toThrow(InvalidSessionPlanError);
		});

		it('throws InvalidTimerConfigError if sessionConfig fails validation', () => {
			expect(() =>
				calculateSessionBudgetByBlocks({
					blockCount: 2,
					sessionConfig: { ...testConfig, focusDurationSeconds: -10 }
				})
			).toThrow();
		});
	});

	describe('calculateSessionBudgetByEndTime', () => {
		it('returns empty blocks when total window W is strictly less than focusDurationSeconds (underflow)', () => {
			const start = 1_000_000;
			// 1000 seconds window < 1500 seconds focus
			const end = start + 1000 * 1000;

			const plan = calculateSessionBudgetByEndTime({
				scheduledStartTimestamp: start,
				targetEndTimestamp: end,
				sessionConfig: testConfig
			});

			expect(plan.targetMode).toBe('end_time');
			expect(plan.blocks).toHaveLength(0);
			expect(plan.freeMarginSeconds).toBe(1000);
			expect(plan.scheduledStartTimestamp).toBe(start);
			expect(plan.targetEndTimestamp).toBe(end);
		});

		it('handles negative or zero window by setting freeMarginSeconds to 0', () => {
			const start = 1_000_000;

			// Equal start and end (W = 0)
			const plan = calculateSessionBudgetByEndTime({
				scheduledStartTimestamp: start,
				targetEndTimestamp: start,
				sessionConfig: testConfig
			});

			expect(plan.blocks).toHaveLength(0);
			expect(plan.freeMarginSeconds).toBe(0);
		});

		it('packs exactly 1 focus block when window exactly matches focus duration', () => {
			const start = 0;
			const end = 1500 * 1000;

			const plan = calculateSessionBudgetByEndTime({
				scheduledStartTimestamp: start,
				targetEndTimestamp: end,
				sessionConfig: testConfig
			});

			expect(plan.blocks).toHaveLength(1);
			expect(plan.blocks[0]).toMatchObject({ index: 0, mode: 'focus', durationSeconds: 1500 });
			expect(plan.freeMarginSeconds).toBe(0);
		});

		it('packs 1 focus block with remaining margin if another cycle does not fit', () => {
			const start = 0;
			// Window = 2000s. Focus is 1500s. Remaining is 500s. Next break (300) + focus (1500) = 1800s > 500s.
			const end = 2000 * 1000;

			const plan = calculateSessionBudgetByEndTime({
				scheduledStartTimestamp: start,
				targetEndTimestamp: end,
				sessionConfig: testConfig
			});

			expect(plan.blocks).toHaveLength(1);
			expect(plan.blocks[0].mode).toBe('focus');
			expect(plan.freeMarginSeconds).toBe(500);
		});

		it('packs exactly 2 focus blocks and 1 short break when window fits exactly', () => {
			const start = 0;
			// 1500 + 300 + 1500 = 3300s
			const end = 3300 * 1000;

			const plan = calculateSessionBudgetByEndTime({
				scheduledStartTimestamp: start,
				targetEndTimestamp: end,
				sessionConfig: testConfig
			});

			expect(plan.blocks).toHaveLength(3);
			expect(plan.blocks[0]).toMatchObject({ index: 0, mode: 'focus', durationSeconds: 1500 });
			expect(plan.blocks[1]).toMatchObject({ index: 1, mode: 'shortBreak', durationSeconds: 300 });
			expect(plan.blocks[2]).toMatchObject({ index: 2, mode: 'focus', durationSeconds: 1500 });
			expect(plan.freeMarginSeconds).toBe(0);
		});

		it('packs multiple cycles with longBreak milestone and computes remaining freeMarginSeconds', () => {
			const config: TimerConfig = {
				focusDurationSeconds: 1500,
				shortBreakDurationSeconds: 300,
				longBreakDurationSeconds: 900,
				roundsBeforeLongBreak: 2
			};

			// Focus 1 (1500)
			// Break 1 (shortBreak, 300)
			// Focus 2 (1500)
			// Break 2 (longBreak, 900)
			// Focus 3 (1500)
			// Total = 1500 + 300 + 1500 + 900 + 1500 = 5700s.
			// Plus 120s spare margin -> 5820s.
			const start = 1000;
			const end = start + 5820 * 1000;

			const plan = calculateSessionBudgetByEndTime({
				scheduledStartTimestamp: start,
				targetEndTimestamp: end,
				sessionConfig: config
			});

			expect(plan.blocks).toHaveLength(5);
			expect(plan.blocks[0].mode).toBe('focus');
			expect(plan.blocks[1].mode).toBe('shortBreak');
			expect(plan.blocks[2].mode).toBe('focus');
			expect(plan.blocks[3].mode).toBe('longBreak');
			expect(plan.blocks[3].durationSeconds).toBe(900);
			expect(plan.blocks[4].mode).toBe('focus');
			expect(plan.freeMarginSeconds).toBe(120);
		});

		it('throws InvalidSessionPlanError on non-finite timestamps', () => {
			expect(() =>
				calculateSessionBudgetByEndTime({
					scheduledStartTimestamp: NaN,
					targetEndTimestamp: 10000,
					sessionConfig: testConfig
				})
			).toThrow(InvalidSessionPlanError);

			expect(() =>
				calculateSessionBudgetByEndTime({
					scheduledStartTimestamp: 10000,
					targetEndTimestamp: Infinity,
					sessionConfig: testConfig
				})
			).toThrow(InvalidSessionPlanError);
		});
	});

	describe('Pure update helpers and immutability', () => {
		const basePlan = calculateSessionBudgetByBlocks({
			blockCount: 3,
			sessionConfig: testConfig
		});

		describe('assignTaskToBlock', () => {
			it('immutably assigns a task to a focus block', () => {
				const updated = assignTaskToBlock(basePlan, 0, 'task-123');

				expect(updated).not.toBe(basePlan);
				expect(updated.blocks).not.toBe(basePlan.blocks);
				expect(updated.blocks[0].assignedTaskId).toBe('task-123');
				expect(basePlan.blocks[0].assignedTaskId).toBeUndefined();
			});

			it('throws InvalidPlanOperationError when assigning task to a break block', () => {
				// Block 1 is a shortBreak
				expect(basePlan.blocks[1].mode).toBe('shortBreak');
				expect(() => assignTaskToBlock(basePlan, 1, 'task-123')).toThrow(InvalidPlanOperationError);
			});

			it('throws InvalidPlanOperationError when taskId is empty or whitespace', () => {
				expect(() => assignTaskToBlock(basePlan, 0, '')).toThrow(InvalidPlanOperationError);
				expect(() => assignTaskToBlock(basePlan, 0, '   ')).toThrow(InvalidPlanOperationError);
			});

			it('throws PlanBlockNotFoundError when blockIndex is invalid or out of range', () => {
				expect(() => assignTaskToBlock(basePlan, -1, 'task-1')).toThrow(PlanBlockNotFoundError);
				expect(() => assignTaskToBlock(basePlan, 999, 'task-1')).toThrow(PlanBlockNotFoundError);
				expect(() => assignTaskToBlock(basePlan, 1.5, 'task-1')).toThrow(PlanBlockNotFoundError);
			});
		});

		describe('unassignTaskFromBlock', () => {
			it('immutably removes assigned task from block', () => {
				const withTask = assignTaskToBlock(basePlan, 0, 'task-456');
				expect(withTask.blocks[0].assignedTaskId).toBe('task-456');

				const unassigned = unassignTaskFromBlock(withTask, 0);
				expect(unassigned).not.toBe(withTask);
				expect(unassigned.blocks[0].assignedTaskId).toBeUndefined();
				expect(withTask.blocks[0].assignedTaskId).toBe('task-456');
			});

			it('throws PlanBlockNotFoundError when blockIndex is out of range', () => {
				expect(() => unassignTaskFromBlock(basePlan, -1)).toThrow(PlanBlockNotFoundError);
				expect(() => unassignTaskFromBlock(basePlan, 10)).toThrow(PlanBlockNotFoundError);
			});
		});

		describe('assignBreakActivityToBlock & unassignBreakActivityFromBlock', () => {
			it('immutably assigns and unassigns break activity for break blocks', () => {
				// Block 1 is a break block
				const withActivity = assignBreakActivityToBlock(basePlan, 1, 'act-stretch');
				expect(withActivity).not.toBe(basePlan);
				expect(withActivity.blocks[1].assignedBreakActivityId).toBe('act-stretch');
				expect(basePlan.blocks[1].assignedBreakActivityId).toBeUndefined();

				const unassigned = unassignBreakActivityFromBlock(withActivity, 1);
				expect(unassigned.blocks[1].assignedBreakActivityId).toBeUndefined();
			});

			it('throws InvalidPlanOperationError when assigning break activity to focus block', () => {
				expect(() => assignBreakActivityToBlock(basePlan, 0, 'act-stretch')).toThrow(
					InvalidPlanOperationError
				);
			});

			it('throws InvalidPlanOperationError when activityId is empty', () => {
				expect(() => assignBreakActivityToBlock(basePlan, 1, '')).toThrow(
					InvalidPlanOperationError
				);
			});

			it('throws PlanBlockNotFoundError when index is out of bounds', () => {
				expect(() => assignBreakActivityToBlock(basePlan, -1, 'act-1')).toThrow(
					PlanBlockNotFoundError
				);
				expect(() => unassignBreakActivityFromBlock(basePlan, -1)).toThrow(PlanBlockNotFoundError);
			});
		});

		describe('updateBlockStatus', () => {
			it('immutably updates block status through valid transitions', () => {
				let plan = updateBlockStatus(basePlan, 0, 'in_progress');
				expect(plan.blocks[0].status).toBe('in_progress');
				expect(basePlan.blocks[0].status).toBe('pending');

				plan = updateBlockStatus(plan, 0, 'completed');
				expect(plan.blocks[0].status).toBe('completed');

				plan = updateBlockStatus(plan, 1, 'skipped');
				expect(plan.blocks[1].status).toBe('skipped');
			});

			it('throws InvalidPlanOperationError on invalid status', () => {
				// @ts-expect-error testing invalid status
				expect(() => updateBlockStatus(basePlan, 0, 'unknown_status')).toThrow(
					InvalidPlanOperationError
				);
			});

			it('throws PlanBlockNotFoundError when blockIndex is out of range', () => {
				expect(() => updateBlockStatus(basePlan, -1, 'completed')).toThrow(PlanBlockNotFoundError);
				expect(() => updateBlockStatus(basePlan, 100, 'completed')).toThrow(PlanBlockNotFoundError);
			});
		});
	});

	describe('validateSessionPlan invariant assertions', () => {
		const validPlan = calculateSessionBudgetByBlocks({
			blockCount: 2,
			sessionConfig: testConfig,
			scheduledStartTimestamp: 1000
		});

		it('passes on valid plans', () => {
			expect(() => validateSessionPlan(validPlan)).not.toThrow();
		});

		it('rejects null or non-object plan', () => {
			// @ts-expect-error testing invalid argument
			expect(() => validateSessionPlan(null)).toThrow(InvalidSessionPlanError);
			// @ts-expect-error testing invalid argument
			expect(() => validateSessionPlan('invalid')).toThrow(InvalidSessionPlanError);
		});

		it('rejects empty id', () => {
			const plan = { ...validPlan, id: '  ' };
			expect(() => validateSessionPlan(plan)).toThrow(InvalidSessionPlanError);
		});

		it('rejects invalid targetMode', () => {
			const plan = { ...validPlan, targetMode: 'unsupported' as unknown as PlanTargetMode };
			expect(() => validateSessionPlan(plan)).toThrow(InvalidSessionPlanError);
		});

		it('rejects invalid createdAt', () => {
			const plan1 = { ...validPlan, createdAt: -5 };
			expect(() => validateSessionPlan(plan1)).toThrow(InvalidSessionPlanError);

			const plan2 = { ...validPlan, createdAt: NaN };
			expect(() => validateSessionPlan(plan2)).toThrow(InvalidSessionPlanError);
		});

		it('rejects negative or non-finite freeMarginSeconds', () => {
			const plan1 = { ...validPlan, freeMarginSeconds: -1 };
			expect(() => validateSessionPlan(plan1)).toThrow(InvalidSessionPlanError);

			const plan2 = { ...validPlan, freeMarginSeconds: NaN };
			expect(() => validateSessionPlan(plan2)).toThrow(InvalidSessionPlanError);
		});

		it('rejects targetEndTimestamp before scheduledStartTimestamp', () => {
			const plan = {
				...validPlan,
				scheduledStartTimestamp: 2000,
				targetEndTimestamp: 1000
			};
			expect(() => validateSessionPlan(plan)).toThrow(InvalidSessionPlanError);
		});

		it('rejects non-array blocks', () => {
			const plan = { ...validPlan, blocks: 'not-an-array' as unknown as readonly PlanBlock[] };
			expect(() => validateSessionPlan(plan)).toThrow(InvalidSessionPlanError);
		});

		it('rejects block index mismatch', () => {
			const alteredBlocks = validPlan.blocks.map((b) => ({ ...b, index: 99 }));
			const plan = { ...validPlan, blocks: alteredBlocks };
			expect(() => validateSessionPlan(plan)).toThrow(InvalidSessionPlanError);
		});

		it('rejects invalid block mode or durationSeconds', () => {
			const badMode = [
				{ ...validPlan.blocks[0], mode: 'coffee_break' as unknown as PlanBlock['mode'] }
			];
			expect(() => validateSessionPlan({ ...validPlan, blocks: badMode })).toThrow(
				InvalidSessionPlanError
			);

			const badDuration = [{ ...validPlan.blocks[0], durationSeconds: 0 }];
			expect(() => validateSessionPlan({ ...validPlan, blocks: badDuration })).toThrow(
				InvalidSessionPlanError
			);
		});

		it('rejects focus block with break activity or break block with focus task', () => {
			const focusWithBreak = [
				{
					...validPlan.blocks[0],
					assignedBreakActivityId: 'act-1'
				},
				validPlan.blocks[1],
				validPlan.blocks[2]
			];
			expect(() => validateSessionPlan({ ...validPlan, blocks: focusWithBreak })).toThrow(
				InvalidSessionPlanError
			);

			const breakWithTask = [
				validPlan.blocks[0],
				{
					...validPlan.blocks[1],
					assignedTaskId: 'task-1'
				},
				validPlan.blocks[2]
			];
			expect(() => validateSessionPlan({ ...validPlan, blocks: breakWithTask })).toThrow(
				InvalidSessionPlanError
			);
		});

		it('rejects non-alternating blocks', () => {
			const consecutiveFocus: PlanBlock[] = [
				{ index: 0, mode: 'focus', durationSeconds: 1500, status: 'pending' },
				{ index: 1, mode: 'focus', durationSeconds: 1500, status: 'pending' }
			];
			expect(() => validateSessionPlan({ ...validPlan, blocks: consecutiveFocus })).toThrow(
				InvalidSessionPlanError
			);
		});

		it('rejects plans starting or ending with break blocks', () => {
			const startsWithBreak: PlanBlock[] = [
				{ index: 0, mode: 'shortBreak', durationSeconds: 300, status: 'pending' },
				{ index: 1, mode: 'focus', durationSeconds: 1500, status: 'pending' }
			];
			expect(() => validateSessionPlan({ ...validPlan, blocks: startsWithBreak })).toThrow(
				InvalidSessionPlanError
			);

			const endsWithBreak: PlanBlock[] = [
				{ index: 0, mode: 'focus', durationSeconds: 1500, status: 'pending' },
				{ index: 1, mode: 'shortBreak', durationSeconds: 300, status: 'pending' }
			];
			expect(() => validateSessionPlan({ ...validPlan, blocks: endsWithBreak })).toThrow(
				InvalidSessionPlanError
			);
		});
	});
});
