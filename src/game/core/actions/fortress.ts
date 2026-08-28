import { getBuildingDefinition } from '@/game/content/buildings';
import type {
  Building,
  BuildingDefinitionId,
  BuildingId,
  Fortress,
  GameState,
  Inventory,
  Position,
} from '@/game/core/types';

export type FortressCommandErrorCode =
  | 'DUPLICATE_BUILDING_ID'
  | 'INVALID_GRID_POSITION'
  | 'OUT_OF_BOUNDS'
  | 'OVERLAPPING_BUILDING'
  | 'INSUFFICIENT_RESOURCES'
  | 'UNKNOWN_BUILDING'
  | 'HOME_BUILDING';

export class FortressCommandError extends Error {
  constructor(
    readonly code: FortressCommandErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'FortressCommandError';
  }
}

export interface PlaceBuildingCommand {
  id: BuildingId;
  definitionId: BuildingDefinitionId;
  position: Position;
  ownerHeroId?: string | null;
}

const isGridPosition = (position: Position): boolean =>
  Number.isInteger(position.x) &&
  Number.isInteger(position.y) &&
  position.x >= 0 &&
  position.y >= 0;

const cellsFor = (definitionId: BuildingDefinitionId, position: Position): Position[] => {
  const footprint = getBuildingDefinition(definitionId).footprint;
  const cells: Position[] = [];

  for (let y = 0; y < footprint.height.value; y += 1) {
    for (let x = 0; x < footprint.width.value; x += 1) {
      cells.push({ x: position.x + x, y: position.y + y });
    }
  }

  return cells;
};

export const getBuildingFootprintCells = (building: Building): Position[] =>
  cellsFor(building.definitionId, building.position);

const cellsOverlap = (left: readonly Position[], right: readonly Position[]): boolean =>
  left.some((leftCell) =>
    right.some((rightCell) => leftCell.x === rightCell.x && leftCell.y === rightCell.y),
  );

const assertValidPosition = (
  fortress: Fortress,
  definitionId: BuildingDefinitionId,
  position: Position,
  excludedBuildingId?: BuildingId,
): void => {
  if (!isGridPosition(position)) {
    throw new FortressCommandError(
      'INVALID_GRID_POSITION',
      '建筑必须放置在要塞内的整数格子上。',
    );
  }

  const candidateCells = cellsFor(definitionId, position);
  if (
    candidateCells.some((cell) => cell.x >= fortress.width || cell.y >= fortress.height)
  ) {
    throw new FortressCommandError('OUT_OF_BOUNDS', '建筑超出了要塞边界。');
  }

  const overlap = fortress.buildings
    .filter((building) => building.id !== excludedBuildingId)
    .find((building) =>
      cellsOverlap(candidateCells, getBuildingFootprintCells(building)),
    );

  if (overlap !== undefined) {
    throw new FortressCommandError(
      'OVERLAPPING_BUILDING',
      `建筑与「${getBuildingDefinition(overlap.definitionId).name}」重叠。`,
    );
  }
};

export const canAffordBuilding = (
  inventory: Inventory,
  definitionId: BuildingDefinitionId,
): boolean => {
  const cost = getBuildingDefinition(definitionId).buildCost.value;
  return Object.entries(cost).every(
    ([itemId, quantity]) =>
      (inventory.items[itemId as keyof Inventory['items']] ?? 0) >= quantity,
  );
};

const spendBuildCost = (
  inventory: Inventory,
  definitionId: BuildingDefinitionId,
): Inventory => {
  const cost = getBuildingDefinition(definitionId).buildCost.value;
  const items = { ...inventory.items };

  for (const [itemId, quantity] of Object.entries(cost)) {
    const typedItemId = itemId as keyof Inventory['items'];
    items[typedItemId] = (items[typedItemId] ?? 0) - quantity;
  }

  return { items };
};

export function placeBuilding(
  state: GameState,
  command: PlaceBuildingCommand,
): GameState {
  if (state.fortress.buildings.some((building) => building.id === command.id)) {
    throw new FortressCommandError(
      'DUPLICATE_BUILDING_ID',
      `建筑 ID「${command.id}」已存在。`,
    );
  }

  assertValidPosition(state.fortress, command.definitionId, command.position);

  if (!canAffordBuilding(state.inventory, command.definitionId)) {
    throw new FortressCommandError('INSUFFICIENT_RESOURCES', '建造资源不足。');
  }

  const building: Building = {
    id: command.id,
    definitionId: command.definitionId,
    position: { ...command.position },
    ownerHeroId: command.ownerHeroId ?? null,
  };

  return {
    ...state,
    fortress: {
      ...state.fortress,
      buildings: [...state.fortress.buildings, building],
    },
    inventory: spendBuildCost(state.inventory, command.definitionId),
  };
}

export function moveBuilding(
  state: GameState,
  buildingId: BuildingId,
  position: Position,
): GameState {
  const building = state.fortress.buildings.find((entry) => entry.id === buildingId);
  if (building === undefined) {
    throw new FortressCommandError('UNKNOWN_BUILDING', `未知建筑「${buildingId}」。`);
  }

  assertValidPosition(state.fortress, building.definitionId, position, buildingId);

  return {
    ...state,
    fortress: {
      ...state.fortress,
      buildings: state.fortress.buildings.map((entry) =>
        entry.id === buildingId ? { ...entry, position: { ...position } } : entry,
      ),
    },
  };
}

export function demolishBuilding(state: GameState, buildingId: BuildingId): GameState {
  const building = state.fortress.buildings.find((entry) => entry.id === buildingId);
  if (building === undefined) {
    throw new FortressCommandError('UNKNOWN_BUILDING', `未知建筑「${buildingId}」。`);
  }

  if (state.heroes.some((hero) => hero.homeBuildingId === buildingId)) {
    throw new FortressCommandError('HOME_BUILDING', '不能拆除仍分配给角色的帐篷。');
  }

  return {
    ...state,
    fortress: {
      ...state.fortress,
      buildings: state.fortress.buildings.filter((entry) => entry.id !== buildingId),
    },
    heroes: state.heroes.map((hero) => {
      const activityBuildingId =
        hero.activity.type === 'TO_REST' ||
        hero.activity.type === 'RESTING' ||
        hero.activity.type === 'TO_WORK' ||
        hero.activity.type === 'WORKING'
          ? hero.activity.buildingId
          : null;

      return activityBuildingId === buildingId
        ? {
            ...hero,
            activity:
              hero.homeBuildingId === null
                ? { type: 'UNPLACED' as const }
                : { type: 'TO_REST' as const, buildingId: hero.homeBuildingId },
          }
        : hero;
    }),
  };
}
