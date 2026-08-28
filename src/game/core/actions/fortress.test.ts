import { createNewGame } from './newGame';
import {
  FortressCommandError,
  demolishBuilding,
  getBuildingFootprintCells,
  moveBuilding,
  placeBuilding,
} from './fortress';

describe('fortress construction commands', () => {
  it('uses each building definition footprint when placing a building', () => {
    const game = createNewGame();
    const next = placeBuilding(game, {
      id: 'mine-02',
      definitionId: 'mine-basic',
      position: { x: 1, y: 6 },
    });
    const mine = next.fortress.buildings.find((building) => building.id === 'mine-02');

    expect(mine).toBeDefined();
    expect(getBuildingFootprintCells(mine!)).toEqual([
      { x: 1, y: 6 },
      { x: 2, y: 6 },
      { x: 1, y: 7 },
      { x: 2, y: 7 },
    ]);
  });

  it('rejects a placement that extends beyond the fortress edge', () => {
    expect(() =>
      placeBuilding(createNewGame(), {
        id: 'mine-edge',
        definitionId: 'mine-basic',
        position: { x: 7, y: 7 },
      }),
    ).toThrow(
      expect.objectContaining<Partial<FortressCommandError>>({ code: 'OUT_OF_BOUNDS' }),
    );
  });

  it('rejects a placement that overlaps an existing building', () => {
    expect(() =>
      placeBuilding(createNewGame(), {
        id: 'tent-overlap',
        definitionId: 'tent-basic',
        position: { x: 3, y: 0 },
      }),
    ).toThrow(
      expect.objectContaining<Partial<FortressCommandError>>({
        code: 'OVERLAPPING_BUILDING',
      }),
    );
  });

  it('requires and spends the configured construction resources', () => {
    const game = createNewGame();
    const insufficient = {
      ...game,
      inventory: { items: { 'copper-ore': 5, sunleaf: 20 } },
    };

    expect(() =>
      placeBuilding(insufficient, {
        id: 'mine-unaffordable',
        definitionId: 'mine-basic',
        position: { x: 1, y: 6 },
      }),
    ).toThrow(
      expect.objectContaining<Partial<FortressCommandError>>({
        code: 'INSUFFICIENT_RESOURCES',
      }),
    );

    const next = placeBuilding(game, {
      id: 'mine-affordable',
      definitionId: 'mine-basic',
      position: { x: 1, y: 6 },
    });

    expect(next.inventory.items['copper-ore']).toBe(14);
  });

  it('moves a building through the same boundary and overlap validation', () => {
    const game = createNewGame();

    expect(() => moveBuilding(game, 'mine-01', { x: 7, y: 0 })).toThrow(
      expect.objectContaining<Partial<FortressCommandError>>({ code: 'OUT_OF_BOUNDS' }),
    );

    const moved = moveBuilding(game, 'mine-01', { x: 1, y: 6 });
    expect(
      moved.fortress.buildings.find((building) => building.id === 'mine-01')?.position,
    ).toEqual({
      x: 1,
      y: 6,
    });
  });

  it('demolishes a work building and returns affected heroes to their tent', () => {
    const game = createNewGame();
    const workingGame = {
      ...game,
      heroes: game.heroes.map((hero, index) =>
        index === 0
          ? {
              ...hero,
              activity: {
                type: 'TO_WORK' as const,
                buildingId: 'mine-01',
                buildingIds: ['mine-01'],
                nextIndex: 0,
              },
            }
          : hero,
      ),
    };

    const next = demolishBuilding(workingGame, 'mine-01');

    expect(next.fortress.buildings.some((building) => building.id === 'mine-01')).toBe(
      false,
    );
    expect(next.heroes[0]?.activity).toEqual({
      type: 'TO_REST',
      buildingId: 'tent-aelan',
    });
  });
});
