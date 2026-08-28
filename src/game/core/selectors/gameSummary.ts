import type { GameState, HeroActivity } from '@/game/core/types';

export interface GameSummary {
  elapsedMs: number;
  heroCount: number;
  buildingCount: number;
  inventoryItemCount: number;
  activities: Partial<Record<HeroActivity['type'], number>>;
}

export function summarizeGameState(state: Readonly<GameState>): GameSummary {
  const activities: GameSummary['activities'] = {};
  for (const hero of state.heroes) {
    activities[hero.activity.type] = (activities[hero.activity.type] ?? 0) + 1;
  }

  return {
    elapsedMs: state.elapsedMs,
    heroCount: state.heroes.length,
    buildingCount: state.fortress.buildings.length,
    inventoryItemCount: Object.values(state.inventory.items).reduce(
      (total, quantity) => total + quantity,
      0,
    ),
    activities,
  };
}
