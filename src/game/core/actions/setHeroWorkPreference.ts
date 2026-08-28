import type { GameState, HeroId, WorkType } from '@/game/core/types';

export function setHeroWorkPreference(
  state: GameState,
  heroId: HeroId,
  workPreference: WorkType,
): GameState {
  let found = false;
  let foundHomeTent = false;
  const heroes = state.heroes.map((hero) => {
    if (hero.id !== heroId) {
      return hero;
    }

    found = true;
    if (hero.homeBuildingId === null) {
      throw new Error(`Hero ${heroId} has no home tent.`);
    }
    return {
      ...hero,
      workPreference,
      activity: {
        type: 'TO_REST' as const,
        buildingId: hero.homeBuildingId,
      },
    };
  });

  if (!found) {
    throw new Error(`Unknown hero: ${heroId}`);
  }

  const updatedHero = heroes.find((hero) => hero.id === heroId)!;
  const buildings = state.fortress.buildings.map((building) => {
    if (building.id !== updatedHero.homeBuildingId) {
      return building;
    }
    foundHomeTent = true;
    return { ...building, workPreference };
  });
  if (!foundHomeTent) {
    throw new Error(`Hero ${heroId} has no home tent.`);
  }

  return { ...state, heroes, fortress: { ...state.fortress, buildings } };
}
