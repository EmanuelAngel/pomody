import type { Component } from 'svelte';
import type { IllustrationId } from '$lib/domain/illustration/illustration-catalog';
import ForestIllustration from './forest-illustration.svelte';
import DesertIllustration from './desert-illustration.svelte';

export interface IllustrationRendererProps {
	phase?: number;
	animated?: boolean;
}

/**
 * Renderer registry keyed by catalog id. `IllustrationId` is derived from the
 * catalog, so adding an illustration there forces a renderer entry here and
 * the parameterized contract test covers it with no new authored test.
 */
export const ILLUSTRATION_RENDERERS: Record<
	IllustrationId,
	Component<IllustrationRendererProps>
> = {
	forest: ForestIllustration,
	desert: DesertIllustration
};
