import { createNewGame } from '@/game/core/actions/newGame';
import type { Building, GameState, Hero, RandomSource } from '@/game/core/types';

import { advance, selectWeightedEntry } from './advance';

const fixedRng = () => 0;

const advanceFor = (
  initialState: GameState,
  durationMs: number,
  rng: RandomSource = fixedRng,
) => {
  let state = initialState;
  let remainingMs = durationMs;
  while (remainingMs > 0) {
    const deltaMs = Math.min(remainingMs, 250);
    state = advance(state, deltaMs, rng);
    remainingMs -= deltaMs;
  }
  return state;
};

const onlyHeroState = (hero: Hero, buildings?: readonly Building[]): GameState => {
  const game = createNewGame();
  return {
    ...game,
    heroes: [hero],
    fortress: {
      ...game.fortress,
      buildings: [...(buildings ?? game.fortress.buildings)],
    },
    inventory: { items: {} },
  };
};

const workingMineHero = (overrides: Partial<Hero> = {}): Hero => {
  const hero = createNewGame().heroes[0]!;
  return {
    ...hero,
    position: { x: 3, y: 0 },
    energy: 30,
    activity: {
      type: 'WORKING',
      buildingId: 'mine-01',
      buildingIds: ['mine-01'],
      nextIndex: 0,
      interactionElapsedMs: 0,
      roundsCompleted: 0,
    },
    ...overrides,
  };
};

describe('advance', () => {
  it('caps one call to 250ms, preserves input state, and advances only fixed steps', () => {
    const state = createNewGame();
    const partial = advance(state, 50, fixedRng);
    const result = advance(state, 900, fixedRng);

    expect(partial.elapsedMs).toBe(50);
    expect(partial.simulationRemainderMs).toBe(50);
    expect(partial.heroes[0]?.activity.type).toBe('IDLE');
    expect(result.elapsedMs).toBe(250);
    expect(result.simulationRemainderMs).toBe(50);
    expect(state.elapsedMs).toBe(0);
    expect(result).not.toBe(state);
  });

  it('uses the rest → select → travel state transitions before work', () => {
    const beforeCompletion = advanceFor(createNewGame(), 2_900);
    const afterCompletion = advanceFor(createNewGame(), 3_000);

    expect(beforeCompletion.heroes[0]?.activity.type).toBe('RESTING');
    expect(beforeCompletion.heroes[0]?.energy).toBe(0);
    expect(afterCompletion.heroes[0]?.energy).toBe(30);
    expect(afterCompletion.heroes[0]?.activity.type).toBe('TO_WORK');
  });

  it('orders the nearest three preferred facilities by tent Manhattan distance then ID', () => {
    const game = createNewGame();
    const hero = game.heroes[0]!;
    const mines: Building[] = [
      {
        id: 'mine-z',
        definitionId: 'mine-basic',
        position: { x: 1, y: 1 },
        ownerHeroId: null,
      },
      {
        id: 'mine-b',
        definitionId: 'mine-basic',
        position: { x: 2, y: 0 },
        ownerHeroId: null,
      },
      {
        id: 'mine-a',
        definitionId: 'mine-basic',
        position: { x: 3, y: 0 },
        ownerHeroId: null,
      },
      {
        id: 'mine-c',
        definitionId: 'mine-basic',
        position: { x: 0, y: 3 },
        ownerHeroId: null,
      },
    ];
    const state = onlyHeroState(
      { ...hero, energy: 0, position: { x: 0, y: 0 }, activity: { type: 'IDLE' } },
      [
        game.fortress.buildings.find((building) => building.id === 'tent-aelan')!,
        ...mines,
      ],
    );

    const result = advanceFor(state, 3_000);
    expect(result.heroes[0]?.activity).toMatchObject({
      type: 'TO_WORK',
      buildingId: 'mine-b',
      buildingIds: ['mine-b', 'mine-z', 'mine-a'],
    });
  });

  it('skips a plan target that was removed before the hero could reserve it', () => {
    const hero = workingMineHero({
      position: { x: 0, y: 0 },
      activity: {
        type: 'SELECTING_WORK',
        buildingIds: ['mine-removed', 'mine-01'],
        nextIndex: 0,
      },
    });

    const result = advanceFor(onlyHeroState(hero), 100);

    expect(result.heroes[0]?.activity).toMatchObject({
      type: 'TO_WORK',
      buildingId: 'mine-01',
      nextIndex: 1,
    });
  });

  it('rolls ore kind then the configured mining-skill star weights with injected RNG', () => {
    const lowSkill = advanceFor(
      onlyHeroState(workingMineHero()),
      3_000,
      (() => {
        const rolls = [0, 0.75];
        return () => rolls.shift() ?? 0;
      })(),
    );
    const baseVeteran = workingMineHero();
    const veteranHero = {
      ...baseVeteran,
      skills: {
        ...baseVeteran.skills,
        mining: { ...baseVeteran.skills.mining, level: 250 },
      },
    };
    const veteran = advanceFor(
      onlyHeroState(veteranHero),
      3_000,
      (() => {
        const rolls = [0, 0.75];
        return () => rolls.shift() ?? 0;
      })(),
    );

    expect(lowSkill.inventory.items['copper-ore-2-star']).toBe(1);
    expect(veteran.inventory.items['copper-ore-3-star']).toBe(1);
    expect(lowSkill.heroes[0]?.skills.mining.xp).toBe(10);
  });

  it('uses deterministic weighted boundaries and clamps invalid RNG values', () => {
    const entries = [
      { name: 'first', weight: { value: 75 } },
      { name: 'second', weight: { value: 25 } },
    ] as const;

    expect(selectWeightedEntry(entries, () => -10)?.name).toBe('first');
    expect(selectWeightedEntry(entries, () => 0.75)?.name).toBe('second');
    expect(selectWeightedEntry(entries, () => Number.NaN)?.name).toBe('first');
  });

  it('stops after the facility round limit and never rewards an incomplete round', () => {
    const afterThreeRounds = advanceFor(onlyHeroState(workingMineHero()), 9_000);
    const insufficientEnergyHero = workingMineHero({
      energy: 2.9,
      activity: {
        type: 'SELECTING_WORK',
        buildingIds: ['mine-01'],
        nextIndex: 0,
      },
    });
    const insufficientEnergy = advanceFor(onlyHeroState(insufficientEnergyHero), 100);

    expect(afterThreeRounds.inventory.items['copper-ore-1-star']).toBe(3);
    expect(afterThreeRounds.heroes[0]?.skills.mining.xp).toBe(30);
    expect(afterThreeRounds.heroes[0]?.activity.type).toBe('TO_REST');
    expect(insufficientEnergy.inventory.items).toEqual({});
    expect(insufficientEnergy.heroes[0]?.skills.mining.xp).toBe(0);
    expect(insufficientEnergy.heroes[0]?.activity.type).toBe('TO_REST');
  });

  it('visits each of three selected facilities once before returning to the tent', () => {
    const game = createNewGame();
    const hero = game.heroes[0]!;
    const mines: Building[] = [
      {
        id: 'mine-a',
        definitionId: 'mine-basic',
        position: { x: 1, y: 0 },
        ownerHeroId: null,
      },
      {
        id: 'mine-b',
        definitionId: 'mine-basic',
        position: { x: 2, y: 0 },
        ownerHeroId: null,
      },
      {
        id: 'mine-c',
        definitionId: 'mine-basic',
        position: { x: 3, y: 0 },
        ownerHeroId: null,
      },
    ];
    const state = onlyHeroState(
      { ...hero, energy: 0, position: { x: 0, y: 0 }, activity: { type: 'IDLE' } },
      [
        game.fortress.buildings.find((building) => building.id === 'tent-aelan')!,
        ...mines,
      ],
    );
    const result = advanceFor(state, 34_000);

    expect(result.inventory.items['copper-ore-1-star']).toBe(9);
    expect(result.heroes[0]?.skills.mining.xp).toBe(90);
    expect(['TO_REST', 'RESTING']).toContain(result.heroes[0]?.activity.type);
  });
});
