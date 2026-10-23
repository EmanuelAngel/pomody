import { describe, it, expect, vi } from 'vitest';
import { createNavigationState } from './navigation.svelte';
import { anchorViewToRunningTimer } from './focus-view';

function createTimer(isRunning: boolean) {
	return { isRunning };
}

describe('anchorViewToRunningTimer', () => {
	it('should move a running block back to the timer view', () => {
		const navigation = createNavigationState('planning');

		anchorViewToRunningTimer(createTimer(true), navigation);

		expect(navigation.activeTab).toBe('timer');
	});

	it('should anchor from every non-timer view', () => {
		const navigation = createNavigationState('distractions');

		anchorViewToRunningTimer(createTimer(true), navigation);

		expect(navigation.activeTab).toBe('timer');
	});

	it('should leave the view untouched when no block is running', () => {
		const navigation = createNavigationState('planning');
		const setTab = vi.spyOn(navigation, 'setTab');

		anchorViewToRunningTimer(createTimer(false), navigation);

		expect(navigation.activeTab).toBe('planning');
		expect(setTab).not.toHaveBeenCalled();
	});

	it('should not write while the timer view is already active, so the effect settles', () => {
		const navigation = createNavigationState('timer');
		const setTab = vi.spyOn(navigation, 'setTab');

		anchorViewToRunningTimer(createTimer(true), navigation);

		expect(setTab).not.toHaveBeenCalled();
	});
});
