import { growthBalance } from '@/game/balance/growth';
import {
  getProfessionArchetype,
  professionArchetypes,
  runePointConfig,
} from '@/game/content/progression';
import { selectWeightedEntry } from '@/game/core/formulas/resourceQuality';
import type {
  BuildingId,
  GameState,
  Hero,
  HeroId,
  ProfessionArchetypeId,
  RandomSource,
  SkillId,
  SkillProgress,
} from '@/game/core/types';

export type RecruitmentErrorCode =
  | 'INSUFFICIENT_TICKETS'
  | 'UNKNOWN_HERO'
  | 'UNKNOWN_TENT'
  | 'NOT_A_TENT'
  | 'TENT_OCCUPIED';

export class RecruitmentError extends Error {
  constructor(
    readonly code: RecruitmentErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'RecruitmentError';
  }
}

const createSkillProgress = (skillId: SkillId): SkillProgress => ({
  skillId,
  kind: skillId === 'staminaTraining' ? 'training' : 'profession',
  level: 0,
  xp: 0,
});

const nextRecruitId = (state: GameState): HeroId => {
  let number = 1;
  let id = `hero-recruit-${String(number).padStart(2, '0')}`;
  while (state.heroes.some((hero) => hero.id === id)) {
    number += 1;
    id = `hero-recruit-${String(number).padStart(2, '0')}`;
  }
  return id;
};

const nextRecruitName = (
  state: GameState,
  archetypeId: ProfessionArchetypeId,
): string => {
  const archetype = getProfessionArchetype(archetypeId);
  const existingCount = state.heroes.filter(
    (hero) => hero.archetypeId === archetypeId,
  ).length;
  const baseName = archetype.recruitNames[existingCount % archetype.recruitNames.length]!;
  const usedCount = state.heroes.filter((hero) => hero.name === baseName).length;
  return usedCount === 0 ? baseName : `${baseName} ${usedCount + 1}`;
};

export const recruitHero = (state: GameState, rng: RandomSource): GameState => {
  const balance = growthBalance.recruitment;
  const tickets = state.inventory.items[balance.ticketItemId] ?? 0;
  if (tickets < balance.ticketCost.value) {
    throw new RecruitmentError('INSUFFICIENT_TICKETS', '招募券不足。');
  }

  const selected = selectWeightedEntry(
    professionArchetypes.map((archetype) => ({
      archetype,
      weight: archetype.recruitWeight,
    })),
    rng,
  );
  if (selected === undefined) {
    throw new Error('No profession archetypes are configured.');
  }
  const { archetype } = selected;

  const hero: Hero = {
    id: nextRecruitId(state),
    name: nextRecruitName(state, archetype.id),
    archetypeId: archetype.id,
    position: {
      x: balance.waitingPosition.x.value,
      y: balance.waitingPosition.y.value,
    },
    energy: balance.initialEnergy.value,
    maxEnergy: balance.maxEnergy.value,
    attributes: {
      stamina: archetype.baseAttributes.stamina.value,
      strength: archetype.baseAttributes.strength.value,
      agility: archetype.baseAttributes.agility.value,
      intelligence: archetype.baseAttributes.intelligence.value,
      knowledge: archetype.baseAttributes.knowledge.value,
    },
    skills: {
      mining: createSkillProgress('mining'),
      herbalism: createSkillProgress('herbalism'),
      staminaTraining: createSkillProgress('staminaTraining'),
    },
    homeBuildingId: null,
    workPreference: 'gather',
    activity: { type: 'UNPLACED' },
    combatLevel: 1,
    combatSkillIds: [...archetype.startingSkillIds],
    combatSkillRollHistory: [],
    equipment: {},
    unlockedRuneNodeIds: [],
    runeChoiceSelections: {},
    runePoints: runePointConfig.initialPoints.value,
  };

  return {
    ...state,
    heroes: [...state.heroes, hero],
    inventory: {
      items: {
        ...state.inventory.items,
        [balance.ticketItemId]: tickets - balance.ticketCost.value,
      },
    },
  };
};

export const assignHeroTent = (
  state: GameState,
  heroId: HeroId,
  tentId: BuildingId,
): GameState => {
  const hero = state.heroes.find((entry) => entry.id === heroId);
  if (hero === undefined) {
    throw new RecruitmentError('UNKNOWN_HERO', `未知角色「${heroId}」。`);
  }
  const tent = state.fortress.buildings.find((building) => building.id === tentId);
  if (tent === undefined) {
    throw new RecruitmentError('UNKNOWN_TENT', `未知帐篷「${tentId}」。`);
  }
  if (tent.definitionId !== 'tent-basic') {
    throw new RecruitmentError('NOT_A_TENT', '只能将角色分配到帐篷。');
  }
  if (tent.ownerHeroId !== null && tent.ownerHeroId !== heroId) {
    throw new RecruitmentError('TENT_OCCUPIED', '该帐篷已有主人。');
  }

  return {
    ...state,
    heroes: state.heroes.map((entry) =>
      entry.id === heroId
        ? {
            ...entry,
            homeBuildingId: tentId,
            position: { ...tent.position },
            activity: { type: 'TO_REST' as const, buildingId: tentId },
          }
        : entry,
    ),
    fortress: {
      ...state.fortress,
      buildings: state.fortress.buildings.map((building) => {
        if (building.id === hero.homeBuildingId && building.id !== tentId) {
          return { ...building, ownerHeroId: null };
        }
        if (building.id === tentId) {
          return {
            ...building,
            ownerHeroId: heroId,
            workPreference: hero.workPreference,
          };
        }
        return building;
      }),
    },
  };
};
