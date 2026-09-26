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
	});
});
