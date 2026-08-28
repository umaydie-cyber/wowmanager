import type {
  AffixId,
  CombatSkillId,
  EquipmentDefinitionId,
  EquipmentQualityId,
  EquipmentSlotId,
  HeroAttributes,
  ProfessionArchetypeId,
  RegionId,
  RuneChoiceId,
  RuneNodeId,
  RunePassiveId,
  RuneTreeId,
} from '@/game/core/types';

import { candidate, confirmed, type ConfigValue } from './valueStatus';

export interface ProfessionArchetypeDefinition {
  id: ProfessionArchetypeId;
  name: string;
  role: string;
  description: string;
  recruitWeight: ConfigValue<number>;
  recruitNames: readonly string[];
  baseAttributes: Record<keyof HeroAttributes, ConfigValue<number>>;
  startingSkillIds: readonly CombatSkillId[];
}

export interface CombatSkillDefinition {
  id: CombatSkillId;
  name: string;
  archetypeId: ProfessionArchetypeId;
  scalingAttribute: keyof HeroAttributes;
  description: string;
}

export interface EquipmentSlotDefinition {
  id: EquipmentSlotId;
  name: string;
  accepts: 'armor' | 'weapon' | 'accessory';
}

export interface EquipmentDefinition {
  id: EquipmentDefinitionId;
  name: string;
  slotId: EquipmentSlotId;
  baseAttribute: keyof HeroAttributes;
  levelOneValue: ConfigValue<number>;
  valuePerLevel: ConfigValue<number>;
}

export interface EquipmentQualityDefinition {
  id: EquipmentQualityId;
  name: string;
  color: string;
  affixCount: ConfigValue<number>;
  powerMultiplier: ConfigValue<number>;
  affixPoolIds: readonly AffixId[];
}

export interface AffixDefinition {
  id: AffixId;
  name: string;
  attribute: keyof HeroAttributes;
  minimumRoll: ConfigValue<number>;
  maximumRoll: ConfigValue<number>;
}

export interface RuneTreeNodeDefinition {
  id: RuneNodeId;
  line: RuneTreeId;
  step: 1 | 2 | 3 | 4 | 5;
  kind: 'attribute' | 'choice';
  prerequisiteIds: readonly RuneNodeId[];
  runePointCost: ConfigValue<number>;
  attributeBonus?: ConfigValue<number>;
  choicePoolIds?: readonly RuneChoiceId[];
}

export const professionArchetypes = [
  {
    id: 'stonewarden',
    name: '岩卫',
    role: '前排守护',
    description: '以耐力和力量稳住阵线的近战守护者。',
    recruitWeight: candidate(1),
    recruitNames: ['岚岩', '砾舟', '青垒'],
    baseAttributes: {
      stamina: candidate(8),
      strength: candidate(7),
      agility: candidate(3),
      intelligence: candidate(3),
      knowledge: candidate(4),
    },
    startingSkillIds: ['guarding-strike'],
  },
  {
    id: 'windstrider',
    name: '逐风者',
    role: '机动输出',
    description: '依靠敏捷与战场标记寻找破绽的远程游侠。',
    recruitWeight: candidate(1),
    recruitNames: ['栖羽', '流弦', '风栎'],
    baseAttributes: {
      stamina: candidate(5),
      strength: candidate(4),
      agility: candidate(8),
      intelligence: candidate(3),
      knowledge: candidate(5),
    },
    startingSkillIds: ['gale-shot'],
  },
  {
    id: 'starweaver',
    name: '织星师',
    role: '法术支援',
    description: '以智力和学识操纵星辉、兼顾伤害与治疗。',
    recruitWeight: candidate(1),
    recruitNames: ['雾芒', '星汐', '澄辉'],
    baseAttributes: {
      stamina: candidate(4),
      strength: candidate(3),
      agility: candidate(4),
      intelligence: candidate(8),
      knowledge: candidate(7),
    },
    startingSkillIds: ['star-spark'],
  },
] as const satisfies readonly ProfessionArchetypeDefinition[];

export const combatSkillPool = [
  {
    id: 'guarding-strike',
    name: '守势打击',
    archetypeId: 'stonewarden',
    scalingAttribute: 'strength',
    description: '造成近战伤害，并短暂强化自身守势。',
  },
  {
    id: 'stone-rally',
    name: '磐石号令',
    archetypeId: 'stonewarden',
    scalingAttribute: 'stamina',
    description: '为附近同伴提供临时护盾。',
  },
  {
    id: 'shield-slam',
    name: '震盾猛击',
    archetypeId: 'stonewarden',
    scalingAttribute: 'strength',
    description: '以护盾震击敌人并打断蓄力。',
  },
  {
    id: 'gale-shot',
    name: '疾风矢',
    archetypeId: 'windstrider',
    scalingAttribute: 'agility',
    description: '快速射击当前目标。',
  },
  {
    id: 'trail-mark',
    name: '寻迹标记',
    archetypeId: 'windstrider',
    scalingAttribute: 'knowledge',
    description: '标记目标，使队伍更容易命中其弱点。',
  },
  {
    id: 'windstep',
    name: '踏风步',
    archetypeId: 'windstrider',
    scalingAttribute: 'agility',
    description: '闪身避开攻击并强化下一次射击。',
  },
  {
    id: 'star-spark',
    name: '星火',
    archetypeId: 'starweaver',
    scalingAttribute: 'intelligence',
    description: '向目标发射一束凝聚星光。',
  },
  {
    id: 'astral-mend',
    name: '星辉愈合',
    archetypeId: 'starweaver',
    scalingAttribute: 'knowledge',
    description: '恢复一名队友的生命。',
  },
  {
    id: 'comet-fall',
    name: '彗星坠落',
    archetypeId: 'starweaver',
    scalingAttribute: 'intelligence',
    description: '召来彗星轰击一片区域。',
  },
] as const satisfies readonly CombatSkillDefinition[];

export const combatProgressionConfig = {
  maximumLevel: candidate(60),
  milestoneLevels: [5, 10] as readonly number[],
  insightReroll: {
    facilityDefinitionId: 'insight-shrine-basic' as const,
    pointCost: candidate(1),
  },
};

export const equipmentSlots = [
  { id: 'head', name: '头部', accepts: 'armor' },
  { id: 'shoulders', name: '肩部', accepts: 'armor' },
  { id: 'chest', name: '胸部', accepts: 'armor' },
  { id: 'legs', name: '腿部', accepts: 'armor' },
  { id: 'gloves', name: '手套', accepts: 'armor' },
  { id: 'weapon', name: '武器', accepts: 'weapon' },
  { id: 'trinket-1', name: '饰品 I', accepts: 'accessory' },
  { id: 'trinket-2', name: '饰品 II', accepts: 'accessory' },
  { id: 'ring-1', name: '戒指 I', accepts: 'accessory' },
  { id: 'ring-2', name: '戒指 II', accepts: 'accessory' },
  { id: 'necklace', name: '项链', accepts: 'accessory' },
] as const satisfies readonly EquipmentSlotDefinition[];

export const equipmentDefinitions = [
  ['warden-helm', '守望战盔', 'head', 'stamina', 3, 0.09],
  ['warden-spaulders', '守望肩甲', 'shoulders', 'strength', 3, 0.08],
  ['warden-cuirass', '守望胸甲', 'chest', 'stamina', 5, 0.12],
  ['warden-greaves', '守望腿甲', 'legs', 'agility', 4, 0.1],
  ['warden-gauntlets', '守望手甲', 'gloves', 'strength', 3, 0.09],
  ['emberblade', '余烬长刃', 'weapon', 'strength', 6, 0.16],
  ['star-compass', '星路罗盘', 'trinket-1', 'knowledge', 2, 0.07],
  ['echo-talisman', '回声护符', 'trinket-2', 'intelligence', 2, 0.07],
  ['copper-band', '赤铜指环', 'ring-1', 'stamina', 2, 0.06],
  ['moon-band', '月辉指环', 'ring-2', 'agility', 2, 0.06],
  ['sunleaf-chain', '日叶项链', 'necklace', 'knowledge', 3, 0.08],
].map(([id, name, slotId, baseAttribute, levelOneValue, valuePerLevel]) => ({
  id,
  name,
  slotId,
  baseAttribute,
  levelOneValue: candidate(levelOneValue),
  valuePerLevel: candidate(valuePerLevel),
})) as EquipmentDefinition[];

const basicAffixes: readonly AffixId[] = [
  'steadfast',
  'forceful',
  'nimble',
  'insightful',
  'learned',
];

const advancedAffixes: readonly AffixId[] = [
  'vital',
  'brutal',
  'fleet',
  'arcane',
  'sagacious',
];

const qualityAffixPools: Record<EquipmentQualityId, readonly AffixId[]> = {
  common: basicAffixes,
  uncommon: basicAffixes,
  rare: [...basicAffixes, ...advancedAffixes.slice(0, 2)],
  epic: [...basicAffixes, ...advancedAffixes.slice(0, 3)],
  legendary: [...basicAffixes, ...advancedAffixes],
  mythic: [...basicAffixes, ...advancedAffixes],
};

const equipmentQualitySeeds: readonly [
  EquipmentQualityId,
  string,
  string,
  number,
  number,
][] = [
  ['common', '白', '#d9e2e9', 0, 1],
  ['uncommon', '绿', '#70c46b', 1, 1.08],
  ['rare', '蓝', '#65a8ff', 2, 1.18],
  ['epic', '紫', '#b77cff', 3, 1.32],
  ['legendary', '橙', '#f0a14a', 4, 1.5],
  ['mythic', '红', '#ef6262', 5, 1.75],
];

export const equipmentQualities: EquipmentQualityDefinition[] = equipmentQualitySeeds.map(
  ([id, name, color, affixCount, multiplier]) => ({
    id,
    name,
    color,
    affixCount: id === 'common' ? confirmed(affixCount) : candidate(affixCount),
    powerMultiplier: candidate(multiplier),
    affixPoolIds: qualityAffixPools[id],
  }),
);

export const affixDefinitions = [
  ['steadfast', '坚韧', 'stamina'],
  ['forceful', '强袭', 'strength'],
  ['nimble', '轻灵', 'agility'],
  ['insightful', '睿智', 'intelligence'],
  ['learned', '博闻', 'knowledge'],
  ['vital', '旺盛', 'stamina'],
  ['brutal', '暴烈', 'strength'],
  ['fleet', '迅捷', 'agility'],
  ['arcane', '奥秘', 'intelligence'],
  ['sagacious', '贤识', 'knowledge'],
].map(([id, name, attribute]) => ({
  id,
  name,
  attribute,
  minimumRoll: candidate(advancedAffixes.includes(id as AffixId) ? 3 : 1),
  maximumRoll: candidate(advancedAffixes.includes(id as AffixId) ? 24 : 18),
})) as AffixDefinition[];

export const equipmentAscensionConfig = {
  maximumItemLevel: confirmed(350),
  copiesRequired: confirmed(3),
  qualityOrder: [
    'common',
    'uncommon',
    'rare',
    'epic',
    'legendary',
    'mythic',
  ] as readonly EquipmentQualityId[],
  premiumPlate: {
    itemId: 'premium-plate' as const,
    copiesReplacedPerPlate: candidate(1),
    maximumReplacedCopies: candidate(2),
  },
  hammerItemByStars: {
    1: 'adamant-hammer-1-star',
    2: 'adamant-hammer-2-star',
    3: 'adamant-hammer-3-star',
  } as const,
};

const runeLines: readonly RuneTreeId[] = [
  'stamina',
  'strength',
  'agility',
  'intelligence',
  'knowledge',
];

const lineChoices: Record<RuneTreeId, readonly RuneChoiceId[]> = {
  stamina: ['iron-roots', 'stone-rally'],
  strength: ['decisive-force', 'shield-slam'],
  agility: ['tailwind', 'windstep'],
  intelligence: ['arcane-current', 'comet-fall'],
  knowledge: ['field-scholar', 'astral-mend'],
};

export const runeTreeNodes: RuneTreeNodeDefinition[] = runeLines.flatMap((line) =>
  ([1, 2, 3, 4, 5] as const).map((step) => ({
    id: `${line}-${step}`,
    line,
    step,
    kind: step === 5 ? 'choice' : 'attribute',
    prerequisiteIds: step === 1 ? [] : ([`${line}-${step - 1}`] as RuneNodeId[]),
    runePointCost: candidate(1),
    ...(step === 5
      ? { choicePoolIds: lineChoices[line] }
      : { attributeBonus: candidate(1) }),
  })),
);

export const runePassiveDefinitions = [
  { id: 'iron-roots', name: '铁根', description: '受击时获得短暂韧性。' },
  { id: 'decisive-force', name: '决断之力', description: '首次命中造成额外伤害。' },
  { id: 'tailwind', name: '尾风', description: '移动后短暂提高闪避。' },
  { id: 'arcane-current', name: '奥术涌流', description: '技能连携提高法术强度。' },
  { id: 'field-scholar', name: '战地学者', description: '队伍获得额外战斗经验。' },
] as const satisfies readonly {
  id: RunePassiveId;
  name: string;
  description: string;
}[];

export const runeResetConfig = {
  itemId: 'rune-dust' as const,
  baseCost: candidate(2),
  costPerUnlockedNode: candidate(1),
};

export const runePointConfig = {
  initialPoints: candidate(10),
  combatLevelAwards: [5, 10, 15, 20, 30, 40, 50, 60].map((combatLevel) => ({
    combatLevel,
    points: candidate(1),
  })),
};

export interface RegionDropEntryDefinition {
  kind: 'material' | 'equipment' | 'recruitment-ticket';
  contentId: string;
  weight: ConfigValue<number>;
  minimumQuantity: ConfigValue<number>;
  maximumQuantity: ConfigValue<number>;
}

export interface RegionDropTableDefinition {
  regionId: RegionId;
  name: string;
  entries: readonly RegionDropEntryDefinition[];
}

const regionDropTableSeeds: readonly [RegionId, string, string, string][] = [
  ['ember-hollow', '余烬谷地', 'copper-ore', 'ember-hollow-gear'],
  ['frostmarch', '霜临边境', 'frost-core', 'frostmarch-gear'],
  ['astral-rift', '星界裂隙', 'astral-fragment', 'astral-rift-gear'],
];

export const regionDropTables: readonly RegionDropTableDefinition[] =
  regionDropTableSeeds.map(([regionId, name, materialId, equipmentId]) => ({
    regionId,
    name,
    entries: [
      {
        kind: 'material',
        contentId: materialId,
        weight: candidate(60),
        minimumQuantity: candidate(2),
        maximumQuantity: candidate(5),
      },
      {
        kind: 'equipment',
        contentId: equipmentId,
        weight: candidate(30),
        minimumQuantity: confirmed(1),
        maximumQuantity: confirmed(1),
      },
      {
        kind: 'recruitment-ticket',
        contentId: 'recruit-ticket',
        weight: candidate(10),
        minimumQuantity: confirmed(1),
        maximumQuantity: confirmed(1),
      },
    ],
  }));

export const getProfessionArchetype = (
  id: ProfessionArchetypeId,
): ProfessionArchetypeDefinition => {
  const definition = professionArchetypes.find((entry) => entry.id === id);
  if (definition === undefined) {
    throw new Error(`Unknown profession archetype: ${id}`);
  }
  return definition;
};

export const getCombatSkillDefinition = (id: CombatSkillId): CombatSkillDefinition => {
  const definition = combatSkillPool.find((entry) => entry.id === id);
  if (definition === undefined) {
    throw new Error(`Unknown combat skill: ${id}`);
  }
  return definition;
};

export const getEquipmentDefinition = (
  id: EquipmentDefinitionId,
): EquipmentDefinition => {
  const definition = equipmentDefinitions.find((entry) => entry.id === id);
  if (definition === undefined) {
    throw new Error(`Unknown equipment definition: ${id}`);
  }
  return definition;
};

export const getEquipmentQuality = (
  id: EquipmentQualityId,
): EquipmentQualityDefinition => {
  const definition = equipmentQualities.find((entry) => entry.id === id);
  if (definition === undefined) {
    throw new Error(`Unknown equipment quality: ${id}`);
  }
  return definition;
};

export const getAffixDefinition = (id: AffixId): AffixDefinition => {
  const definition = affixDefinitions.find((entry) => entry.id === id);
  if (definition === undefined) {
    throw new Error(`Unknown affix: ${id}`);
  }
  return definition;
};

export const getRuneNodeDefinition = (id: RuneNodeId): RuneTreeNodeDefinition => {
  const definition = runeTreeNodes.find((entry) => entry.id === id);
  if (definition === undefined) {
    throw new Error(`Unknown rune node: ${id}`);
  }
  return definition;
};

export const getRuneChoiceName = (id: RuneChoiceId): string => {
  const passive = runePassiveDefinitions.find((entry) => entry.id === id);
  return passive?.name ?? getCombatSkillDefinition(id as CombatSkillId).name;
};
