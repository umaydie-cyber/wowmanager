import { z } from 'zod';

import {
  GAME_SCHEMA_VERSION,
  type Building,
  type Fortress,
  type GameState,
  type Hero,
  type HeroActivity,
  type Inventory,
  type SaveFile,
  type SkillProgress,
} from '@/game/core/types';

const positionSchema = z.object({ x: z.number().finite(), y: z.number().finite() });
const gridPositionSchema = z.object({
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
});
const workPlanSchema = {
  buildingIds: z.array(z.string().min(1)),
  nextIndex: z.number().int().nonnegative(),
} as const;

export const heroActivitySchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('UNPLACED') }),
  z.object({ type: z.literal('IDLE') }),
  z.object({ type: z.literal('TO_REST'), buildingId: z.string().min(1) }),
  z.object({
    type: z.literal('RESTING'),
    buildingId: z.string().min(1),
    elapsedMs: z.number().finite().nonnegative(),
  }),
  z.object({ type: z.literal('SELECTING_WORK'), ...workPlanSchema }),
  z.object({
    type: z.literal('TO_WORK'),
    buildingId: z.string().min(1),
    ...workPlanSchema,
  }),
  z.object({
    type: z.literal('WORKING'),
    buildingId: z.string().min(1),
    interactionElapsedMs: z.number().finite().nonnegative(),
    roundsCompleted: z.number().int().nonnegative(),
    ...workPlanSchema,
  }),
  z.object({ type: z.literal('TO_GUILD') }),
  z.object({ type: z.literal('WAITING_PARTY') }),
  z.object({ type: z.literal('EXPEDITION') }),
  z.object({ type: z.literal('BOSS_READY') }),
  z.object({ type: z.literal('BOSS_BATTLE') }),
]) satisfies z.ZodType<HeroActivity>;

const skillIdSchema = z.enum(['mining', 'herbalism', 'staminaTraining']);
const combatSkillIdSchema = z.enum([
  'guarding-strike',
  'stone-rally',
  'shield-slam',
  'gale-shot',
  'trail-mark',
  'windstep',
  'star-spark',
  'astral-mend',
  'comet-fall',
]);
const equipmentSlotIdSchema = z.enum([
  'head',
  'shoulders',
  'chest',
  'legs',
  'gloves',
  'weapon',
  'trinket-1',
  'trinket-2',
  'ring-1',
  'ring-2',
  'necklace',
]);
const equipmentDefinitionIdSchema = z.enum([
  'warden-helm',
  'warden-spaulders',
  'warden-cuirass',
  'warden-greaves',
  'warden-gauntlets',
  'emberblade',
  'star-compass',
  'echo-talisman',
  'copper-band',
  'moon-band',
  'sunleaf-chain',
]);
const equipmentQualityIdSchema = z.enum([
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
  'mythic',
]);
const affixIdSchema = z.enum([
  'steadfast',
  'forceful',
  'nimble',
  'insightful',
  'learned',
  'vital',
  'brutal',
  'fleet',
  'arcane',
  'sagacious',
]);
const runeNodeIdSchema = z.enum([
  'stamina-1',
  'stamina-2',
  'stamina-3',
  'stamina-4',
  'stamina-5',
  'strength-1',
  'strength-2',
  'strength-3',
  'strength-4',
  'strength-5',
  'agility-1',
  'agility-2',
  'agility-3',
  'agility-4',
  'agility-5',
  'intelligence-1',
  'intelligence-2',
  'intelligence-3',
  'intelligence-4',
  'intelligence-5',
  'knowledge-1',
  'knowledge-2',
  'knowledge-3',
  'knowledge-4',
  'knowledge-5',
]);
const runeChoiceIdSchema = z.union([
  combatSkillIdSchema,
  z.enum(['iron-roots', 'decisive-force', 'tailwind', 'arcane-current', 'field-scholar']),
]);

export const skillProgressSchema = z.object({
  skillId: skillIdSchema,
  kind: z.enum(['profession', 'training']),
  level: z.number().int().nonnegative(),
  xp: z.number().finite().nonnegative(),
}) satisfies z.ZodType<SkillProgress>;

const equipmentInstanceSchema = z.object({
  id: z.string().min(1),
  definitionId: equipmentDefinitionIdSchema,
  itemLevel: z.number().int().min(1).max(350),
  qualityId: equipmentQualityIdSchema,
  affixIds: z.array(affixIdSchema).max(5),
});

export const heroSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  archetypeId: z
    .enum(['stonewarden', 'windstrider', 'starweaver'])
    .default('stonewarden'),
  position: positionSchema,
  energy: z.number().finite().nonnegative(),
  maxEnergy: z.number().finite().positive(),
  attributes: z.object({
    stamina: z.number().finite().nonnegative(),
    strength: z.number().finite().nonnegative(),
    agility: z.number().finite().nonnegative(),
    intelligence: z.number().finite().nonnegative(),
    knowledge: z.number().finite().nonnegative(),
  }),
  skills: z.object({
    mining: skillProgressSchema,
    herbalism: skillProgressSchema,
    staminaTraining: skillProgressSchema,
  }),
  homeBuildingId: z.string().min(1).nullable(),
  workPreference: z.enum(['gather', 'training']),
  activity: heroActivitySchema,
  combatLevel: z.number().int().min(1).max(60).default(1),
  combatSkillIds: z.array(combatSkillIdSchema).default([]),
  combatSkillRollHistory: z
    .array(
      z.object({
        source: z.enum(['milestone', 'insight']),
        resultSkillId: combatSkillIdSchema,
        milestoneLevel: z.number().int().positive().optional(),
        previousSkillId: combatSkillIdSchema.optional(),
      }),
    )
    .default([]),
  equipment: z.partialRecord(equipmentSlotIdSchema, equipmentInstanceSchema).default({}),
  unlockedRuneNodeIds: z.array(runeNodeIdSchema).default([]),
  runeChoiceSelections: z.partialRecord(runeNodeIdSchema, runeChoiceIdSchema).default({}),
  runePoints: z.number().int().nonnegative().default(10),
}) satisfies z.ZodType<Hero>;

export const buildingSchema = z.object({
  id: z.string().min(1),
  definitionId: z.enum([
    'tent-basic',
    'mine-basic',
    'herb-garden-basic',
    'gym-basic',
    'insight-shrine-basic',
  ]),
  position: gridPositionSchema,
  ownerHeroId: z.string().min(1).nullable(),
  workPreference: z.enum(['gather', 'training']).optional(),
}) satisfies z.ZodType<Building>;

export const fortressSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  buildings: z.array(buildingSchema),
}) satisfies z.ZodType<Fortress>;

const itemIdSchema = z.enum([
  'copper-ore',
  'iron-ore',
  'silver-ore',
  'copper-ore-1-star',
  'copper-ore-2-star',
  'copper-ore-3-star',
  'iron-ore-1-star',
  'iron-ore-2-star',
  'iron-ore-3-star',
  'silver-ore-1-star',
  'silver-ore-2-star',
  'silver-ore-3-star',
  'sunleaf',
  'moonbell',
  'recruit-ticket',
  'adamant-hammer-1-star',
  'adamant-hammer-2-star',
  'adamant-hammer-3-star',
  'premium-plate',
  'rune-dust',
  'ember-shard',
  'frost-core',
  'astral-fragment',
  'recipe-ember-tonic-placeholder',
  'recipe-frostguard-placeholder',
  'recipe-astral-tea-placeholder',
  'equipment-ember-hollow-placeholder',
  'equipment-frostmarch-placeholder',
  'equipment-astral-rift-placeholder',
]);

export const inventorySchema = z.object({
  items: z.partialRecord(itemIdSchema, z.number().int().nonnegative()),
}) satisfies z.ZodType<Inventory>;

const regionProgressSchema = z.object({
  completedWaveCount: z.number().int().min(0).max(3),
  bossDefeated: z.boolean(),
  victoryCount: z.number().int().nonnegative().default(0),
});
const emptyRegionProgress = {
  completedWaveCount: 0,
  bossDefeated: false,
  victoryCount: 0,
};

export const gameStateSchema = z.object({
  schemaVersion: z.literal(GAME_SCHEMA_VERSION),
  elapsedMs: z.number().finite().nonnegative(),
  simulationRemainderMs: z.number().finite().nonnegative().default(0),
  fortress: fortressSchema,
  heroes: z.array(heroSchema),
  inventory: inventorySchema,
  equipmentInventory: z.array(equipmentInstanceSchema).default([]),
  progression: z
    .object({
      insightPoints: z.number().int().nonnegative(),
      nextEquipmentInstanceNumber: z.number().int().positive(),
      pendingEquipmentAscension: z
        .object({
          outputInstanceId: z.string().min(1),
          definitionId: equipmentDefinitionIdSchema,
          itemLevel: z.number().int().min(1).max(350),
          targetQualityId: equipmentQualityIdSchema,
          retainedAffixIds: z.array(affixIdSchema),
          candidateAffixIds: z.array(affixIdSchema).min(1).max(3),
        })
        .nullable(),
    })
    .default({
      insightPoints: 0,
      nextEquipmentInstanceNumber: 1,
      pendingEquipmentAscension: null,
    }),
  expedition: z
    .object({
      regionProgress: z.object({
        'ember-hollow': regionProgressSchema.default(emptyRegionProgress),
        frostmarch: regionProgressSchema.default(emptyRegionProgress),
        'astral-rift': regionProgressSchema.default(emptyRegionProgress),
      }),
      active: z
        .object({
          regionId: z.enum(['ember-hollow', 'frostmarch', 'astral-rift']),
          heroIds: z.array(z.string().min(1)).min(1).max(5),
          phase: z.enum([
            'GATHERING',
            'MOBS',
            'BOSS_READY',
            'BOSS_BATTLE',
            'VICTORY',
            'DEFEAT',
          ]),
          currentWaveIndex: z.number().int().min(0).max(3),
          waveElapsedMs: z.number().finite().nonnegative(),
          rewards: z.array(
            z.object({ itemId: itemIdSchema, quantity: z.number().int().positive() }),
          ),
        })
        .nullable(),
    })
    .default({
      regionProgress: {
        'ember-hollow': emptyRegionProgress,
        frostmarch: emptyRegionProgress,
        'astral-rift': emptyRegionProgress,
      },
      active: null,
    }),
}) satisfies z.ZodType<GameState>;

export const saveFileSchema = z.object({
  schemaVersion: z.literal(GAME_SCHEMA_VERSION),
  savedAtEpochMs: z.number().int().nonnegative(),
  game: gameStateSchema,
}) satisfies z.ZodType<SaveFile>;

const saveHeaderSchema = z.object({
  schemaVersion: z.union([z.literal(1), z.literal(GAME_SCHEMA_VERSION)]),
  savedAtEpochMs: z.number().int().nonnegative(),
  game: z.unknown(),
});

/** Parse current saves and migrate v1 by adding v2 defaults before final validation. */
export const parseSaveFile = (input: unknown): SaveFile => {
  const header = saveHeaderSchema.parse(input);
  if (header.schemaVersion === GAME_SCHEMA_VERSION) {
    return saveFileSchema.parse(header);
  }
  const legacyGame = z
    .object({ schemaVersion: z.literal(1) })
    .passthrough()
    .parse(header.game);
  const legacyHeroes = Array.isArray(legacyGame.heroes)
    ? legacyGame.heroes.map((hero: unknown) => {
        if (hero === null || typeof hero !== 'object') {
          return hero;
        }
        const record = hero as Record<string, unknown>;
        const selections =
          record.runeChoiceSelections !== null &&
          typeof record.runeChoiceSelections === 'object'
            ? (record.runeChoiceSelections as Record<string, unknown>)
            : {};
        const unlockedRuneNodeIds = Array.isArray(record.unlockedRuneNodeIds)
          ? record.unlockedRuneNodeIds.filter(
              (nodeId) =>
                typeof nodeId !== 'string' ||
                !nodeId.endsWith('-5') ||
                typeof selections[nodeId] === 'string',
            )
          : record.unlockedRuneNodeIds;
        return { ...record, unlockedRuneNodeIds };
      })
    : legacyGame.heroes;
  return saveFileSchema.parse({
    ...header,
    schemaVersion: GAME_SCHEMA_VERSION,
    game: {
      ...legacyGame,
      schemaVersion: GAME_SCHEMA_VERSION,
      heroes: legacyHeroes,
    },
  });
};
