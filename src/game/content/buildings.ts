import type {
  BuildingDefinitionId,
  ItemId,
  OreStar,
  SkillId,
  WorkType,
} from '@/game/core/types';
import { growthBalance } from '@/game/balance/growth';

import { candidate, confirmed, type ConfigValue } from './valueStatus';

export interface ItemDropDefinition {
  itemId: ItemId;
  weight: ConfigValue<number>;
  quantity: ConfigValue<number>;
}

export interface MiningStarDropTier {
  minimumSkill: ConfigValue<number>;
  maximumSkill: ConfigValue<number>;
  starWeights: readonly {
    stars: OreStar;
    weight: ConfigValue<number>;
  }[];
}

export interface WorkRewardDefinition {
  itemDrops: readonly ItemDropDefinition[];
  skillId: SkillId;
  skillExperience: ConfigValue<number>;
  /** Present for mine rewards: roll item kind first, then this quality table. */
  miningStarDropTable?: readonly MiningStarDropTier[];
}

interface RestInteractionDefinition {
  kind: 'rest';
  durationMs: ConfigValue<number>;
}

interface UtilityInteractionDefinition {
  kind: 'utility';
}

export interface WorkInteractionDefinition {
  kind: 'work';
  workType: WorkType;
  durationMs: ConfigValue<number>;
  maxRounds: ConfigValue<number>;
  energyPerSecond: ConfigValue<number>;
  reward: WorkRewardDefinition;
}

export interface BuildingDefinition {
  id: BuildingDefinitionId;
  name: string;
  category: 'rest' | 'utility' | WorkType;
  footprint: {
    width: ConfigValue<number>;
    height: ConfigValue<number>;
  };
  serviceCapacity: ConfigValue<number>;
  buildCost: ConfigValue<Partial<Record<ItemId, number>>>;
  interaction:
    RestInteractionDefinition | WorkInteractionDefinition | UtilityInteractionDefinition;
}

/**
 * Candidate MVP values from the product design. The ranges are inclusive and
 * deliberately live with the rest of the building balance data.
 */
export const miningStarDropTable = growthBalance.resourceQuality
  .mining satisfies readonly MiningStarDropTier[];

export const buildingDefinitions = [
  {
    id: 'tent-basic',
    name: '帐篷',
    category: 'rest',
    footprint: { width: confirmed(1), height: confirmed(1) },
    serviceCapacity: candidate(1),
    buildCost: candidate({ 'copper-ore': 2 }),
    interaction: {
      kind: 'rest',
      // Resting takes time; the exact duration is still a candidate balance value.
      durationMs: candidate(3_000),
    },
  },
  {
    id: 'mine-basic',
    name: '初级矿坑',
    category: 'gather',
    footprint: { width: candidate(2), height: candidate(2) },
    serviceCapacity: candidate(1),
    buildCost: candidate({ 'copper-ore': 6 }),
    interaction: {
      kind: 'work',
      workType: 'gather',
      durationMs: confirmed(3_000),
      maxRounds: confirmed(3),
      energyPerSecond: candidate(1),
      reward: {
        itemDrops: [
          { itemId: 'copper-ore', weight: candidate(70), quantity: candidate(1) },
          { itemId: 'iron-ore', weight: candidate(25), quantity: candidate(1) },
          { itemId: 'silver-ore', weight: candidate(5), quantity: candidate(1) },
        ],
        skillId: 'mining',
        skillExperience: confirmed(10),
        miningStarDropTable,
      },
    },
  },
  {
    id: 'herb-garden-basic',
    name: '初级药圃',
    category: 'gather',
    footprint: { width: candidate(2), height: candidate(2) },
    serviceCapacity: candidate(1),
    buildCost: candidate({ sunleaf: 6 }),
    interaction: {
      kind: 'work',
      workType: 'gather',
      durationMs: candidate(3_000),
      maxRounds: candidate(3),
      energyPerSecond: candidate(1),
      reward: {
        itemDrops: [
          { itemId: 'sunleaf', weight: candidate(80), quantity: candidate(1) },
          { itemId: 'moonbell', weight: candidate(20), quantity: candidate(1) },
        ],
        skillId: 'herbalism',
        skillExperience: candidate(10),
      },
    },
  },
  {
    id: 'gym-basic',
    name: '健身房',
    category: 'training',
    footprint: { width: candidate(2), height: candidate(2) },
    serviceCapacity: candidate(1),
    buildCost: candidate({ 'copper-ore': 4, sunleaf: 4 }),
    interaction: {
      kind: 'work',
      workType: 'training',
      durationMs: confirmed(5_000),
      maxRounds: confirmed(2),
      energyPerSecond: candidate(1),
      reward: {
        itemDrops: [],
        skillId: 'staminaTraining',
        skillExperience: confirmed(10),
      },
    },
  },
  {
    id: 'insight-shrine-basic',
    name: '顿悟圣坛',
    category: 'utility',
    footprint: { width: candidate(2), height: candidate(2) },
    serviceCapacity: candidate(1),
    buildCost: candidate({ 'copper-ore': 8, 'ember-shard': 2 }),
    interaction: { kind: 'utility' },
  },
] as const satisfies readonly BuildingDefinition[];

export function getBuildingDefinition(id: BuildingDefinitionId): BuildingDefinition {
  const definition = buildingDefinitions.find((entry) => entry.id === id);
  if (definition === undefined) {
    throw new Error(`Unknown building definition: ${id}`);
  }
  return definition;
}
