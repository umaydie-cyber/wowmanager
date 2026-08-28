import {
  combatProgressionConfig,
  combatSkillPool,
  runePointConfig,
} from '@/game/content/progression';
import type {
  CombatSkillId,
  GameState,
  Hero,
  HeroId,
  RandomSource,
} from '@/game/core/types';

export class CombatSkillCommandError extends Error {}

const clampRoll = (value: number): number =>
  Number.isFinite(value) ? Math.min(Math.max(value, 0), 0.999_999) : 0;

const selectSkill = (
  hero: Hero,
  excludedIds: readonly CombatSkillId[],
  rng: RandomSource,
): CombatSkillId | undefined => {
  const excluded = new Set(excludedIds);
  const pool = combatSkillPool.filter(
    (skill) => skill.archetypeId === hero.archetypeId && !excluded.has(skill.id),
  );
  return pool[Math.floor(clampRoll(rng()) * pool.length)]?.id;
};

const levelHero = (hero: Hero, levels: number, rng: RandomSource): Hero => {
  const targetLevel = Math.min(
    combatProgressionConfig.maximumLevel.value,
    hero.combatLevel + Math.max(0, Math.trunc(levels)),
  );
  let nextHero = { ...hero, combatSkillIds: [...hero.combatSkillIds] };
  for (const milestone of combatProgressionConfig.milestoneLevels) {
    if (hero.combatLevel >= milestone || targetLevel < milestone) {
      continue;
    }
    const resultSkillId = selectSkill(nextHero, nextHero.combatSkillIds, rng);
    if (resultSkillId !== undefined) {
      nextHero = {
        ...nextHero,
        combatSkillIds: [...nextHero.combatSkillIds, resultSkillId],
        combatSkillRollHistory: [
          ...nextHero.combatSkillRollHistory,
          { source: 'milestone', milestoneLevel: milestone, resultSkillId },
        ],
      };
    }
  }
  const awardedRunePoints = runePointConfig.combatLevelAwards
    .filter(
      (award) => hero.combatLevel < award.combatLevel && targetLevel >= award.combatLevel,
    )
    .reduce((sum, award) => sum + award.points.value, 0);
  return {
    ...nextHero,
    combatLevel: targetLevel,
    runePoints: nextHero.runePoints + awardedRunePoints,
  };
};

export const grantCombatLevels = (
  state: GameState,
  heroId: HeroId,
  levels: number,
  rng: RandomSource,
): GameState => {
  if (!state.heroes.some((hero) => hero.id === heroId)) {
    throw new CombatSkillCommandError('找不到目标角色。');
  }
  return {
    ...state,
    heroes: state.heroes.map((hero) =>
      hero.id === heroId ? levelHero(hero, levels, rng) : hero,
    ),
  };
};

export const grantPartyCombatLevels = (
  state: GameState,
  heroIds: readonly HeroId[],
  levels: number,
  rng: RandomSource,
): GameState => {
  const party = new Set(heroIds);
  return {
    ...state,
    heroes: state.heroes.map((hero) =>
      party.has(hero.id) ? levelHero(hero, levels, rng) : hero,
    ),
  };
};

export const rerollCombatSkill = (
  state: GameState,
  heroId: HeroId,
  skillId: CombatSkillId,
  rng: RandomSource,
): GameState => {
  const hero = state.heroes.find((entry) => entry.id === heroId);
  if (hero === undefined || !hero.combatSkillIds.includes(skillId)) {
    throw new CombatSkillCommandError('角色没有这个可重随技能。');
  }
  if (
    !state.fortress.buildings.some(
      (building) =>
        building.definitionId ===
        combatProgressionConfig.insightReroll.facilityDefinitionId,
    )
  ) {
    throw new CombatSkillCommandError('需要先建造顿悟圣坛。');
  }
  const pointCost = combatProgressionConfig.insightReroll.pointCost.value;
  if (state.progression.insightPoints < pointCost) {
    throw new CombatSkillCommandError(`顿悟点不足，需要 ${pointCost} 点。`);
  }
  const resultSkillId = selectSkill(hero, [...hero.combatSkillIds, skillId], rng);
  if (resultSkillId === undefined) {
    throw new CombatSkillCommandError('当前职业没有其他可重随技能。');
  }

  return {
    ...state,
    progression: {
      ...state.progression,
      insightPoints: state.progression.insightPoints - pointCost,
    },
    heroes: state.heroes.map((entry) =>
      entry.id === heroId
        ? {
            ...entry,
            combatSkillIds: entry.combatSkillIds.map((current) =>
              current === skillId ? resultSkillId : current,
            ),
            combatSkillRollHistory: [
              ...entry.combatSkillRollHistory,
              {
                source: 'insight',
                previousSkillId: skillId,
                resultSkillId,
              },
            ],
          }
        : entry,
    ),
  };
};
