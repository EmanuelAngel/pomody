import { describe, it, expect } from 'vitest';
import { NavigationState, createNavigationState, navigationState } from './navigation.svelte';

describe('NavigationState', () => {
	describe('Initialization', () => {
		it('should default to timer tab on initialization', () => {
			const nav = createNavigationState();
			expect(nav.activeTab).toBe('timer');
		});

		it('should accept custom initial tab', () => {
			const nav = createNavigationState('planning');
			expect(nav.activeTab).toBe('planning');
		});

		it('should export a singleton navigationState defaulting to timer', () => {
			expect(navigationState).toBeInstanceOf(NavigationState);
			expect(navigationState.activeTab).toBe('timer');
		});
	});

	describe('Tab Switching', () => {
		it('should switch to the distractions tab', () => {
			const nav = createNavigationState('timer');

			nav.setTab('distractions');

			expect(nav.activeTab).toBe('distractions');
		});

		it('should update activeTab when setTab is called', () => {
			const nav = createNavigationState();
			expect(nav.activeTab).toBe('timer');

			nav.setTab('planning');
			expect(nav.activeTab).toBe('planning');

			nav.setTab('timer');
			expect(nav.activeTab).toBe('timer');
		});

		it('should update activeTab when setter is called', () => {
			const nav = createNavigationState();
			expect(nav.activeTab).toBe('timer');

			nav.activeTab = 'planning';
			expect(nav.activeTab).toBe('planning');

			nav.activeTab = 'timer';
			expect(nav.activeTab).toBe('timer');
		});

		it('should switch to the metrics tab', () => {
			const nav = createNavigationState();

			nav.setTab('metrics');

			expect(nav.activeTab).toBe('metrics');
		});
	});

	describe('Settings requests', () => {
		it('should have no pending request on initialization', () => {
			expect(createNavigationState().settingsRequest).toBeNull();
		});

		it('should expose the requested settings tab', () => {
			const nav = createNavigationState();

			nav.requestSettings('metrics');

			expect(nav.settingsRequest?.tab).toBe('metrics');
		});

		it('should issue a new request every time, even for the same tab', () => {
			const nav = createNavigationState();

			nav.requestSettings('metrics');
			const first = nav.settingsRequest;
			nav.requestSettings('metrics');

			expect(nav.settingsRequest).not.toBe(first);
			expect(nav.settingsRequest?.id).toBeGreaterThan(first?.id ?? 0);
		});

		it('should not change the active tab', () => {
			const nav = createNavigationState('planning');

			nav.requestSettings('metrics');

			expect(nav.activeTab).toBe('planning');
		});
	});
});
