import { getRegionDefinition, isRegionUnlocked } from '@/game/content/regions';
import { grantPartyCombatLevels } from '@/game/core/actions/combatSkills';
import type {
  ExpeditionReward,
  GameState,
  Hero,
  HeroId,
  RandomSource,
  RegionId,
} from '@/game/core/types';

export class ExpeditionCommandError extends Error {}

const returnHeroToFortress = (hero: Hero): Hero => ({
  ...hero,
  activity: hero.homeBuildingId === null ? { type: 'UNPLACED' } : { type: 'IDLE' },
});

export const dispatchExpedition = (
  state: GameState,
  regionId: RegionId,
  heroIds: readonly HeroId[],
): GameState => {
  if (state.expedition.active !== null) {
    throw new ExpeditionCommandError('当前已有远征正在进行。');
  }
  if (!isRegionUnlocked(state.expedition, regionId)) {
    throw new ExpeditionCommandError(getRegionDefinition(regionId).unlock.label);
  }

  const uniqueHeroIds = [...new Set(heroIds)];
  if (uniqueHeroIds.length === 0 || uniqueHeroIds.length > 5) {
    throw new ExpeditionCommandError('远征队必须包含 1–5 名角色。');
  }
  if (uniqueHeroIds.some((id) => !state.heroes.some((hero) => hero.id === id))) {
    throw new ExpeditionCommandError('远征队中包含未知角色。');
  }

  const previousProgress = state.expedition.regionProgress[regionId];
  const progress = previousProgress.bossDefeated
    ? { ...previousProgress, completedWaveCount: 0, bossDefeated: false }
    : previousProgress;
  const party = new Set(uniqueHeroIds);

  return {
    ...state,
    heroes: state.heroes.map((hero) =>
      party.has(hero.id) ? { ...hero, activity: { type: 'TO_GUILD' } } : hero,
    ),
    expedition: {
      regionProgress: {
        ...state.expedition.regionProgress,
        [regionId]: progress,
      },
      active: {
        regionId,
        heroIds: uniqueHeroIds,
        phase: 'GATHERING',
        currentWaveIndex: progress.completedWaveCount,
        waveElapsedMs: 0,
        rewards: [],
      },
    },
  };
};

export const markBossBattleStarted = (state: GameState): GameState => {
  const active = state.expedition.active;
  if (active?.phase !== 'BOSS_READY') {
    throw new ExpeditionCommandError('Boss 尚未就绪。');
  }
  const party = new Set(active.heroIds);
  return {
    ...state,
    heroes: state.heroes.map((hero) =>
      party.has(hero.id) ? { ...hero, activity: { type: 'BOSS_BATTLE' } } : hero,
    ),
    expedition: {
      ...state.expedition,
      active: { ...active, phase: 'BOSS_BATTLE' },
    },
  };
};

const selectDrop = (state: GameState, rng: RandomSource) => {
  const active = state.expedition.active;
  if (active === null) {
    throw new ExpeditionCommandError('没有可结算的远征。');
  }
  const drops = getRegionDefinition(active.regionId).drops;
  const totalWeight = drops.reduce((sum, drop) => sum + drop.weight, 0);
  const roll = Math.min(Math.max(rng(), 0), 0.999_999) * totalWeight;
  let cursor = 0;
  return (
    drops.find((drop) => {
      cursor += drop.weight;
      return roll < cursor;
    }) ?? drops[drops.length - 1]!
  );
};

export const resolveBossVictory = (state: GameState, rng: RandomSource): GameState => {
  const active = state.expedition.active;
  if (active?.phase !== 'BOSS_BATTLE') {
    throw new ExpeditionCommandError('Boss 战不在可结算状态。');
  }
  const region = getRegionDefinition(active.regionId);
  const rewardMap = new Map<string, ExpeditionReward>();

  for (let rollIndex = 0; rollIndex < region.rewardRolls; rollIndex += 1) {
    const drop = selectDrop(state, rng);
    const quantityRange = drop.maximumQuantity - drop.minimumQuantity + 1;
    const quantity =
      drop.minimumQuantity +
      Math.floor(Math.min(Math.max(rng(), 0), 0.999_999) * quantityRange);
    const current = rewardMap.get(drop.itemId);
    rewardMap.set(drop.itemId, {
      itemId: drop.itemId,
      quantity: (current?.quantity ?? 0) + quantity,
    });
  }

  const rewards = [...rewardMap.values()];
  const nextItems = { ...state.inventory.items };
  rewards.forEach(({ itemId, quantity }) => {
    nextItems[itemId] = (nextItems[itemId] ?? 0) + quantity;
  });

  const progressedState = grantPartyCombatLevels(
    state,
    active.heroIds,
    region.combatLevelsRewarded,
    rng,
  );

  return {
    ...progressedState,
    heroes: progressedState.heroes.map((hero) =>
      active.heroIds.includes(hero.id) ? returnHeroToFortress(hero) : hero,
    ),
    inventory: { items: nextItems },
    expedition: {
      regionProgress: {
        ...state.expedition.regionProgress,
        [active.regionId]: {
          completedWaveCount: region.waves.length,
          bossDefeated: true,
          victoryCount: state.expedition.regionProgress[active.regionId].victoryCount + 1,
        },
      },
      active: { ...active, phase: 'VICTORY', rewards },
    },
  };
};

export const resolveBossDefeat = (state: GameState): GameState => {
  const active = state.expedition.active;
  if (active?.phase !== 'BOSS_BATTLE') {
    throw new ExpeditionCommandError('Boss 战不在可结算状态。');
  }
  return {
    ...state,
    heroes: state.heroes.map((hero) =>
      active.heroIds.includes(hero.id) ? returnHeroToFortress(hero) : hero,
    ),
    expedition: {
      ...state.expedition,
      active: { ...active, phase: 'DEFEAT', rewards: [] },
    },
  };
};

export const closeExpeditionResult = (state: GameState): GameState => {
  const phase = state.expedition.active?.phase;
  if (phase !== 'VICTORY' && phase !== 'DEFEAT') {
    throw new ExpeditionCommandError('当前没有可关闭的远征结算。');
  }
  return {
    ...state,
    expedition: { ...state.expedition, active: null },
  };
};
