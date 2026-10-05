import { t } from '$lib/state/locale.svelte';
import type { BreakCategory } from '$lib/domain/breaks/break-activity.entity';

export function getLocalizedPresetTitle(activity: {
	id: string;
	title: string;
	isPreset?: boolean;
}): string {
	if (!activity.isPreset) {
		return activity.title;
	}

	switch (activity.id) {
		case 'preset-neck-shoulder-stretch':
			return t.break_preset_neck_shoulder_stretch_title();
		case 'preset-wrist-forearm-relief':
			return t.break_preset_wrist_forearm_relief_title();
		case 'preset-standing-backbend-reach':
			return t.break_preset_standing_backbend_reach_title();
		case 'preset-quick-room-stroll':
			return t.break_preset_quick_room_stroll_title();
		case 'preset-box-breathing':
			return t.break_preset_box_breathing_title();
		case 'preset-20-20-20-eye-rest':
			return t.break_preset_20_20_20_eye_rest_title();
		case 'preset-sensory-grounding':
			return t.break_preset_sensory_grounding_title();
		case 'preset-mental-reset':
			return t.break_preset_mental_reset_title();
		case 'preset-glass-of-water':
			return t.break_preset_glass_of_water_title();
		case 'preset-mindful-herbal-tea':
			return t.break_preset_mindful_herbal_tea_title();
		default:
			return activity.title;
	}
}

export function getLocalizedPresetGuide(activity: {
	id: string;
	guide?: string;
	isPreset?: boolean;
}): string | undefined {
	if (!activity.isPreset) {
		return activity.guide;
	}

	switch (activity.id) {
		case 'preset-neck-shoulder-stretch':
			return t.break_preset_neck_shoulder_stretch_guide();
		case 'preset-wrist-forearm-relief':
			return t.break_preset_wrist_forearm_relief_guide();
		case 'preset-standing-backbend-reach':
			return t.break_preset_standing_backbend_reach_guide();
		case 'preset-quick-room-stroll':
			return t.break_preset_quick_room_stroll_guide();
		case 'preset-box-breathing':
			return t.break_preset_box_breathing_guide();
		case 'preset-20-20-20-eye-rest':
			return t.break_preset_20_20_20_eye_rest_guide();
		case 'preset-sensory-grounding':
			return t.break_preset_sensory_grounding_guide();
		case 'preset-mental-reset':
			return t.break_preset_mental_reset_guide();
		case 'preset-glass-of-water':
			return t.break_preset_glass_of_water_guide();
		case 'preset-mindful-herbal-tea':
			return t.break_preset_mindful_herbal_tea_guide();
		default:
			return activity.guide;
	}
}

export function getLocalizedBreakCategory(category: BreakCategory): string {
	switch (category) {
		case 'physical':
			return t.break_category_physical();
		case 'mindful':
			return t.break_category_mindful();
		case 'hydration':
			return t.break_category_hydration();
	}
}
