import { getRegionDefinition } from '@/game/content/regions';
import type { GameState, HeroActivity } from '@/game/core/types';

const withPartyActivity = (state: GameState, activity: HeroActivity): GameState => {
  const active = state.expedition.active;
  if (active === null) {
    return state;
  }
  const party = new Set(active.heroIds);
  return {
    ...state,
    heroes: state.heroes.map((hero) =>
      party.has(hero.id) ? { ...hero, activity } : hero,
    ),
  };
};

export const advanceExpedition = (state: GameState, deltaMs: number): GameState => {
  const active = state.expedition.active;
  if (active === null) {
    return state;
  }
  const region = getRegionDefinition(active.regionId);

  if (active.phase === 'GATHERING') {
    const partyIsReady = active.heroIds.every(
      (heroId) =>
        state.heroes.find((hero) => hero.id === heroId)?.activity.type ===
        'WAITING_PARTY',
    );
    if (!partyIsReady) {
      return state;
    }
    const shouldChallengeBoss =
      state.expedition.regionProgress[active.regionId].completedWaveCount >=
      region.waves.length;
    const next = withPartyActivity(state, {
      type: shouldChallengeBoss ? 'BOSS_READY' : 'EXPEDITION',
    });
    return {
      ...next,
      expedition: {
        ...next.expedition,
        active: {
          ...active,
          phase: shouldChallengeBoss ? 'BOSS_READY' : 'MOBS',
          currentWaveIndex: shouldChallengeBoss
            ? region.waves.length
            : active.currentWaveIndex,
          waveElapsedMs: 0,
        },
      },
    };
  }

  if (active.phase !== 'MOBS') {
    return state;
  }

  const wave = region.waves[active.currentWaveIndex];
  if (wave === undefined) {
    return state;
  }
  const elapsedMs = active.waveElapsedMs + deltaMs;
  if (elapsedMs < wave.durationMs) {
    return {
      ...state,
      expedition: {
        ...state.expedition,
        active: { ...active, waveElapsedMs: elapsedMs },
      },
    };
  }

  const completedWaveCount = active.currentWaveIndex + 1;
  const bossReady = completedWaveCount >= region.waves.length;
  const next = bossReady ? withPartyActivity(state, { type: 'BOSS_READY' }) : state;
  return {
    ...next,
    expedition: {
      regionProgress: {
        ...next.expedition.regionProgress,
        [active.regionId]: {
          ...next.expedition.regionProgress[active.regionId],
          completedWaveCount,
        },
      },
      active: {
        ...active,
        phase: bossReady ? 'BOSS_READY' : 'MOBS',
        currentWaveIndex: completedWaveCount,
        waveElapsedMs: 0,
      },
    },
  };
};
