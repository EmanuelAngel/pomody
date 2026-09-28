import { seedToTree } from './seed-to-tree';
import { gymGains } from './gym-gains';
import type { PlantModel } from './types';

export type {
	PlantModel,
	SceneActor,
	SceneActivity,
	ScenePainter,
	SceneState,
	IdleInk
} from './types';
export { composeScene, selectFrameIndex } from './pixel-canvas';

/** Registry of selectable plant models. Register new models here; the first is the fallback. */
export const PLANT_MODELS: readonly PlantModel[] = Object.freeze([seedToTree, gymGains]);

export function getPlantModel(id: string): PlantModel {
	return PLANT_MODELS.find((model) => model.id === id) ?? PLANT_MODELS[0];
}
