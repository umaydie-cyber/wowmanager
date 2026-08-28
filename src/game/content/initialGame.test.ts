import { buildingDefinitions } from './buildings';
import { initialHeroDefinitions } from './heroes';
import { initialGameConfig } from './initialGame';
import {
  affixDefinitions,
  combatSkillPool,
  equipmentQualities,
  equipmentSlots,
  professionArchetypes,
  regionDropTables,
  runeTreeNodes,
} from './progression';
import { createNewGame } from '@/game/core/actions/newGame';
import { getBuildingFootprintCells } from '@/game/core/actions/fortress';

describe('initial game content', () => {
  it('preserves the MVP buildings and adds the configured insight facility', () => {
    expect(buildingDefinitions.map((definition) => definition.id)).toEqual([
      'tent-basic',
      'mine-basic',
      'herb-garden-basic',
      'gym-basic',
      'insight-shrine-basic',
    ]);
    expect(initialHeroDefinitions).toHaveLength(3);
    expect(initialGameConfig.fortress.width.value).toBe(8);
    expect(initialGameConfig.fortress.height.value).toBe(8);
  });

  it('defines the data-driven mid-game growth content', () => {
    expect(professionArchetypes).toHaveLength(3);
    expect(combatSkillPool).toHaveLength(9);
    expect(equipmentSlots).toHaveLength(11);
    expect(equipmentQualities.map((quality) => quality.id)).toEqual([
      'common',
      'uncommon',
      'rare',
      'epic',
      'legendary',
      'mythic',
    ]);
    expect(affixDefinitions).toHaveLength(10);
    expect(runeTreeNodes).toHaveLength(25);
    expect(regionDropTables[0]?.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'recruitment-ticket' }),
        expect.objectContaining({ kind: 'equipment' }),
      ]),
    );
  });

  it('marks the exact timed-rest duration as a candidate value', () => {
    const tent = buildingDefinitions[0];

    expect(tent.interaction).toEqual({
      kind: 'rest',
      durationMs: { value: 3_000, status: 'candidate' },
    });
  });

  it('starts with a readable, non-overlapping 8×8 fortress layout', () => {
    const game = createNewGame();
    const buildings = game.fortress.buildings;
    const occupiedCells = buildings.flatMap((building) =>
      getBuildingFootprintCells(building).map((cell) => `${cell.x},${cell.y}`),
    );

    expect(
      buildings.filter((building) => building.definitionId === 'tent-basic'),
    ).toHaveLength(3);
    expect(
      buildings.filter((building) => building.definitionId === 'mine-basic'),
    ).toHaveLength(1);
    expect(
      buildings.filter((building) => building.definitionId === 'herb-garden-basic'),
    ).toHaveLength(1);
    expect(
      buildings.filter((building) => building.definitionId === 'gym-basic'),
    ).toHaveLength(1);
    expect(new Set(occupiedCells).size).toBe(occupiedCells.length);
    expect(occupiedCells).toEqual(
      expect.arrayContaining([
        '0,0',
        '0,2',
        '0,4',
        '3,0',
        '4,1',
        '3,3',
        '4,4',
        '6,5',
        '7,6',
      ]),
    );
  });
});
