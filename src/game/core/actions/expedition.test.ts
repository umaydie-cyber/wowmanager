import { isRegionUnlocked, regionDefinitions } from '@/game/content/regions';

import { createNewGame } from './newGame';
import { dispatchExpedition, resolveBossVictory } from './expedition';

describe('region expansion', () => {
  it('defines three regions with sequential, visible unlock requirements', () => {
    const game = createNewGame();
    expect(regionDefinitions.map((region) => region.id)).toEqual([
      'ember-hollow',
      'frostmarch',
      'astral-rift',
    ]);
    expect(isRegionUnlocked(game.expedition, 'ember-hollow')).toBe(true);
    expect(isRegionUnlocked(game.expedition, 'frostmarch')).toBe(false);
    expect(() => dispatchExpedition(game, 'frostmarch', ['hero-aelan'])).toThrow(
      '击败余烬谷地 Boss 1 次',
    );
  });

  it('increments victory progress and unlocks the next region after a boss clear', () => {
    const game = createNewGame();
    const battle = {
      ...game,
      expedition: {
        ...game.expedition,
        active: {
          regionId: 'ember-hollow' as const,
          heroIds: ['hero-aelan'],
          phase: 'BOSS_BATTLE' as const,
          currentWaveIndex: 3,
          waveElapsedMs: 0,
          rewards: [],
        },
      },
    };
    const victory = resolveBossVictory(battle, () => 0);

    expect(victory.expedition.regionProgress['ember-hollow']).toEqual({
      completedWaveCount: 3,
      bossDefeated: true,
      victoryCount: 1,
    });
    expect(isRegionUnlocked(victory.expedition, 'frostmarch')).toBe(true);
    expect(victory.heroes[0]?.combatLevel).toBe(3);
  });
});
