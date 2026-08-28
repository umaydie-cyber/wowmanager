import type {
  ExpeditionState,
  InventoryItemId,
  Position,
  RegionId,
} from '@/game/core/types';

export interface RegionWaveDefinition {
  id: string;
  name: string;
  enemyName: string;
  durationMs: number;
}

export interface RegionDropEntry {
  kind: 'material' | 'recipe' | 'equipment' | 'recruitment-ticket';
  itemId: InventoryItemId;
  weight: number;
  minimumQuantity: number;
  maximumQuantity: number;
}

export interface RegionDefinition {
  id: RegionId;
  name: string;
  description: string;
  unlock: {
    prerequisiteRegionId: RegionId | null;
    requiredVictories: number;
    label: string;
  };
  guildMeetingPoint: Position;
  waves: readonly RegionWaveDefinition[];
  boss: {
    id: string;
    name: string;
    maxHealth: number;
  };
  rewardRolls: number;
  combatLevelsRewarded: number;
  drops: readonly RegionDropEntry[];
}

export const regionDefinitions: readonly RegionDefinition[] = [
  {
    id: 'ember-hollow',
    name: '余烬谷地',
    description: '穿过焦土兽群，讨伐熔核巨像。',
    unlock: {
      prerequisiteRegionId: null,
      requiredVictories: 0,
      label: '初始开放',
    },
    guildMeetingPoint: { x: 7, y: 7 },
    waves: [
      { id: 'ash-hounds', name: '第一波', enemyName: '灰烬猎犬', durationMs: 2_000 },
      { id: 'cinder-imps', name: '第二波', enemyName: '烬火小鬼', durationMs: 2_000 },
      { id: 'slag-guards', name: '第三波', enemyName: '炉渣守卫', durationMs: 2_000 },
    ],
    boss: { id: 'molten-colossus', name: '熔核巨像', maxHealth: 420 },
    rewardRolls: 2,
    combatLevelsRewarded: 2,
    drops: [
      {
        kind: 'material',
        itemId: 'ember-shard',
        weight: 45,
        minimumQuantity: 3,
        maximumQuantity: 6,
      },
      {
        kind: 'recipe',
        itemId: 'recipe-ember-tonic-placeholder',
        weight: 20,
        minimumQuantity: 1,
        maximumQuantity: 1,
      },
      {
        kind: 'equipment',
        itemId: 'equipment-ember-hollow-placeholder',
        weight: 25,
        minimumQuantity: 1,
        maximumQuantity: 1,
      },
      {
        kind: 'recruitment-ticket',
        itemId: 'recruit-ticket',
        weight: 10,
        minimumQuantity: 1,
        maximumQuantity: 1,
      },
    ],
  },
  {
    id: 'frostmarch',
    name: '霜临边境',
    description: '在永冻哨线抵御霜裔军团。',
    unlock: {
      prerequisiteRegionId: 'ember-hollow',
      requiredVictories: 1,
      label: '击败余烬谷地 Boss 1 次',
    },
    guildMeetingPoint: { x: 7, y: 7 },
    waves: [
      { id: 'ice-wolves', name: '第一波', enemyName: '冻原狼群', durationMs: 2_500 },
      { id: 'rime-archers', name: '第二波', enemyName: '霜痕射手', durationMs: 2_500 },
      { id: 'frozen-vanguard', name: '第三波', enemyName: '冰封先锋', durationMs: 2_500 },
    ],
    boss: { id: 'rime-queen', name: '霜冠女王', maxHealth: 760 },
    rewardRolls: 3,
    combatLevelsRewarded: 3,
    drops: [
      {
        kind: 'material',
        itemId: 'frost-core',
        weight: 50,
        minimumQuantity: 2,
        maximumQuantity: 5,
      },
      {
        kind: 'recipe',
        itemId: 'recipe-frostguard-placeholder',
        weight: 20,
        minimumQuantity: 1,
        maximumQuantity: 1,
      },
      {
        kind: 'equipment',
        itemId: 'equipment-frostmarch-placeholder',
        weight: 25,
        minimumQuantity: 1,
        maximumQuantity: 1,
      },
      {
        kind: 'recruitment-ticket',
        itemId: 'recruit-ticket',
        weight: 5,
        minimumQuantity: 1,
        maximumQuantity: 1,
      },
    ],
  },
  {
    id: 'astral-rift',
    name: '星界裂隙',
    description: '穿越失重裂隙，关闭吞噬要塞的虚空门。',
    unlock: {
      prerequisiteRegionId: 'frostmarch',
      requiredVictories: 1,
      label: '击败霜临边境 Boss 1 次',
    },
    guildMeetingPoint: { x: 7, y: 7 },
    waves: [
      { id: 'riftlings', name: '第一波', enemyName: '裂隙幼体', durationMs: 3_000 },
      { id: 'void-callers', name: '第二波', enemyName: '虚空唤者', durationMs: 3_000 },
      { id: 'star-devourers', name: '第三波', enemyName: '噬星兽', durationMs: 3_000 },
    ],
    boss: { id: 'astral-maw', name: '星渊巨口', maxHealth: 1_200 },
    rewardRolls: 3,
    combatLevelsRewarded: 4,
    drops: [
      {
        kind: 'material',
        itemId: 'astral-fragment',
        weight: 50,
        minimumQuantity: 2,
        maximumQuantity: 4,
      },
      {
        kind: 'recipe',
        itemId: 'recipe-astral-tea-placeholder',
        weight: 18,
        minimumQuantity: 1,
        maximumQuantity: 1,
      },
      {
        kind: 'equipment',
        itemId: 'equipment-astral-rift-placeholder',
        weight: 27,
        minimumQuantity: 1,
        maximumQuantity: 1,
      },
      {
        kind: 'recruitment-ticket',
        itemId: 'recruit-ticket',
        weight: 5,
        minimumQuantity: 1,
        maximumQuantity: 1,
      },
    ],
  },
];

export const getRegionDefinition = (regionId: RegionId): RegionDefinition => {
  const region = regionDefinitions.find((entry) => entry.id === regionId);
  if (region === undefined) {
    throw new Error(`Unknown region: ${regionId}`);
  }
  return region;
};

export const isRegionUnlocked = (
  expedition: ExpeditionState,
  regionId: RegionId,
): boolean => {
  const { prerequisiteRegionId, requiredVictories } =
    getRegionDefinition(regionId).unlock;
  return (
    prerequisiteRegionId === null ||
    expedition.regionProgress[prerequisiteRegionId].victoryCount >= requiredVictories
  );
};
