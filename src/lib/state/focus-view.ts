import type { NavigationState } from './navigation.svelte';

/**
 * Zen Mode recedes the header while a block runs, and the Timer view is the only
 * surface that can still drive the session. A running block therefore anchors the
 * app to that view: any other tab would leave the user with neither navigation nor
 * timer controls, which is the deadlock reported in #168.
 *
 * The rule is expressed once, as an invariant, instead of patching each route that
 * can hand control back to the shell — the compact-mode restore button, `Escape`,
 * the tray, a restored snapshot. Every one of them starts with a running timer, so
 * anchoring on `isRunning` covers all of them by construction.
 *
 * The `activeTab` guard makes the write idempotent: callers drive this from an
 * effect, and an unconditional write would re-trigger itself forever.
 */
export function anchorViewToRunningTimer(
	timer: { readonly isRunning: boolean },
	navigation: Pick<NavigationState, 'activeTab' | 'setTab'>
): void {
	if (!timer.isRunning || navigation.activeTab === 'timer') {
		return;
	}

	navigation.setTab('timer');
}
