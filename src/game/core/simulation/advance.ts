import { simulationBalance } from '@/game/balance/simulation';
import {
  getBuildingDefinition,
  type WorkInteractionDefinition,
} from '@/game/content/buildings';
import { addSkillExperience } from '@/game/core/formulas/experience';
import { getRegionDefinition } from '@/game/content/regions';
import { advanceExpedition } from '@/game/core/simulation/expedition';
import {
  rollResourceQuality,
  selectWeightedEntry,
} from '@/game/core/formulas/resourceQuality';
import type {
  Building,
  BuildingId,
  GameState,
  Hero,
  HeroActivity,
  Inventory,
  InventoryItemId,
  Position,
  RandomSource,
} from '@/game/core/types';
import { isOreItemId, toStarredOreItemId } from '@/game/core/types';

const POSITION_EPSILON = 0.000_001;
const MAX_IMMEDIATE_TRANSITIONS = 16;

interface HeroAdvanceResult {
  hero: Hero;
  inventory: Inventory;
}

const getBuilding = (state: GameState, buildingId: BuildingId): Building => {
  const building = state.fortress.buildings.find((entry) => entry.id === buildingId);
  if (building === undefined) {
    throw new Error(`Unknown building: ${buildingId}`);
  }
  return building;
};

const isAtPosition = (position: Position, target: Position): boolean =>
  Math.abs(position.x - target.x) <= POSITION_EPSILON &&
  Math.abs(position.y - target.y) <= POSITION_EPSILON;

const moveToward = (position: Position, target: Position, deltaMs: number): Position => {
  let distanceRemaining =
    simulationBalance.heroMovementTilesPerSecond.value * (deltaMs / 1_000);
  const next = { ...position };

  const xDistance = target.x - next.x;
  const xMovement =
    Math.sign(xDistance) * Math.min(Math.abs(xDistance), distanceRemaining);
  next.x += xMovement;
  distanceRemaining -= Math.abs(xMovement);

  const yDistance = target.y - next.y;
  const yMovement =
    Math.sign(yDistance) * Math.min(Math.abs(yDistance), distanceRemaining);
  next.y += yMovement;

  return next;
};

const manhattanDistance = (left: Position, right: Position): number =>
  Math.abs(left.x - right.x) + Math.abs(left.y - right.y);

const createWorkPlan = (state: GameState, hero: Hero): BuildingId[] => {
  if (hero.homeBuildingId === null) {
    return [];
  }
  const home = getBuilding(state, hero.homeBuildingId);
  const workPreference = home.workPreference ?? hero.workPreference;

  return state.fortress.buildings
    .filter((building) => {
      const definition = getBuildingDefinition(building.definitionId);
      return definition.category === workPreference;
    })
    .sort((left, right) => {
      const distanceDifference =
        manhattanDistance(home.position, left.position) -
        manhattanDistance(home.position, right.position);
      return distanceDifference === 0
        ? left.id.localeCompare(right.id)
        : distanceDifference;
    })
    .slice(0, 3)
    .map((building) => building.id);
};

const activityReservesBuilding = (
  activity: HeroActivity,
  buildingId: BuildingId,
): boolean =>
  (activity.type === 'TO_WORK' || activity.type === 'WORKING') &&
  activity.buildingId === buildingId;

const isBuildingBusy = (
  state: GameState,
  buildingId: BuildingId,
  heroId: string,
): boolean => {
  const building = getBuilding(state, buildingId);
  const capacity = getBuildingDefinition(building.definitionId).serviceCapacity.value;
  const reservations = state.heroes.filter(
    (hero) => hero.id !== heroId && activityReservesBuilding(hero.activity, buildingId),
  ).length;

  return reservations >= capacity;
};

const requiredRoundEnergy = (definition: WorkInteractionDefinition): number =>
  definition.energyPerSecond.value * (definition.durationMs.value / 1_000);

const toRest = (hero: Hero): Hero => ({
  ...hero,
  activity:
    hero.homeBuildingId === null
      ? { type: 'UNPLACED' }
      : { type: 'TO_REST', buildingId: hero.homeBuildingId },
});

const resolveImmediateActivity = (state: GameState, initialHero: Hero): Hero => {
  let hero = initialHero;

  for (let transition = 0; transition < MAX_IMMEDIATE_TRANSITIONS; transition += 1) {
    switch (hero.activity.type) {
      case 'UNPLACED':
        return hero;

      case 'IDLE':
        hero = toRest(hero);
        break;

      case 'TO_REST': {
        const restBuilding = getBuilding(state, hero.activity.buildingId);
        if (!isAtPosition(hero.position, restBuilding.position)) {
          return hero;
        }
        hero = {
          ...hero,
          activity: {
            type: 'RESTING',
            buildingId: restBuilding.id,
            elapsedMs: 0,
          },
        };
        break;
      }

      case 'SELECTING_WORK': {
        let index = hero.activity.nextIndex;
        while (index < hero.activity.buildingIds.length) {
          const candidateId = hero.activity.buildingIds[index]!;
          const exists = state.fortress.buildings.some(
            (building) => building.id === candidateId,
          );
          if (exists && !isBuildingBusy(state, candidateId, hero.id)) {
            break;
          }
          index += 1;
        }

        const buildingId = hero.activity.buildingIds[index];
        if (buildingId === undefined) {
          hero = toRest(hero);
          break;
        }

        const building = getBuilding(state, buildingId);
        const interaction = getBuildingDefinition(building.definitionId).interaction;
        if (interaction.kind !== 'work') {
          throw new Error(`Building ${buildingId} cannot be used for work.`);
        }

        if (hero.energy < requiredRoundEnergy(interaction)) {
          hero = toRest(hero);
          break;
        }

        hero = {
          ...hero,
          activity: {
            type: 'TO_WORK',
            buildingId,
            buildingIds: hero.activity.buildingIds,
            nextIndex: index,
          },
        };
        break;
      }

      case 'TO_WORK': {
        const workBuilding = getBuilding(state, hero.activity.buildingId);
        if (!isAtPosition(hero.position, workBuilding.position)) {
          return hero;
        }
        hero = {
          ...hero,
          activity: {
            type: 'WORKING',
            buildingId: hero.activity.buildingId,
            buildingIds: hero.activity.buildingIds,
            nextIndex: hero.activity.nextIndex,
            interactionElapsedMs: 0,
            roundsCompleted: 0,
          },
        };
        break;
      }

      case 'RESTING':
      case 'WORKING':
      case 'TO_GUILD':
      case 'WAITING_PARTY':
      case 'EXPEDITION':
      case 'BOSS_READY':
      case 'BOSS_BATTLE':
        return hero;
    }
  }

  throw new Error(`Hero ${hero.id} exceeded the immediate transition limit.`);
};

export { selectWeightedEntry } from '@/game/core/formulas/resourceQuality';

const getMiningStar = (
  hero: Hero,
  definition: WorkInteractionDefinition,
  rng: RandomSource,
) => {
  const tiers = definition.reward.miningStarDropTable;
  if (tiers === undefined) {
    return undefined;
  }

  return rollResourceQuality(hero.skills.mining.level, tiers, rng);
};

const completeWorkRound = (
  hero: Hero,
  inventory: Inventory,
  definition: WorkInteractionDefinition,
  rng: RandomSource,
): HeroAdvanceResult => {
  const drops = definition.reward.itemDrops;
  let nextInventory = inventory;

  if (drops.length > 0) {
    const selected = selectWeightedEntry(drops, rng);
    if (selected === undefined) {
      throw new Error('A work reward with drops must have at least one drop entry.');
    }
    const stars = getMiningStar(hero, definition, rng);
    const inventoryItemId: InventoryItemId =
      stars === undefined || !isOreItemId(selected.itemId)
        ? selected.itemId
        : toStarredOreItemId(selected.itemId, stars);

    nextInventory = {
      items: {
        ...inventory.items,
        [inventoryItemId]:
          (inventory.items[inventoryItemId] ?? 0) + selected.quantity.value,
      },
    };
  }

  const skillId = definition.reward.skillId;
  return {
    hero: {
      ...hero,
      skills: {
        ...hero.skills,
        [skillId]: addSkillExperience(
          hero.skills[skillId],
          definition.reward.skillExperience.value,
        ),
      },
    },
    inventory: nextInventory,
  };
};

const advanceHero = (
  state: GameState,
  initialHero: Hero,
  deltaMs: number,
  inventory: Inventory,
  rng: RandomSource,
): HeroAdvanceResult => {
  const mustReturnToRest =
    initialHero.energy <= 0 &&
    (initialHero.activity.type === 'SELECTING_WORK' ||
      initialHero.activity.type === 'TO_WORK' ||
      initialHero.activity.type === 'WORKING');
  let hero = resolveImmediateActivity(
    state,
    mustReturnToRest ? toRest(initialHero) : initialHero,
  );
  let nextInventory = inventory;

  switch (hero.activity.type) {
    case 'UNPLACED':
      break;

    case 'TO_REST':
    case 'TO_WORK': {
      const target = getBuilding(state, hero.activity.buildingId);
      hero = {
        ...hero,
        position: moveToward(hero.position, target.position, deltaMs),
      };
      break;
    }

    case 'RESTING': {
      const restBuilding = getBuilding(state, hero.activity.buildingId);
      const interaction = getBuildingDefinition(restBuilding.definitionId).interaction;
      if (interaction.kind !== 'rest') {
        throw new Error(`Building ${restBuilding.id} cannot be used for resting.`);
      }

      const elapsedMs = Math.min(
        hero.activity.elapsedMs + deltaMs,
        interaction.durationMs.value,
      );
      hero = {
        ...hero,
        energy: elapsedMs >= interaction.durationMs.value ? hero.maxEnergy : hero.energy,
        activity:
          elapsedMs >= interaction.durationMs.value
            ? {
                type: 'SELECTING_WORK',
                buildingIds: createWorkPlan(state, hero),
                nextIndex: 0,
              }
            : {
                type: 'RESTING',
                buildingId: hero.activity.buildingId,
                elapsedMs,
              },
      };
      break;
    }

    case 'WORKING': {
      const workBuilding = getBuilding(state, hero.activity.buildingId);
      const interaction = getBuildingDefinition(workBuilding.definitionId).interaction;
      if (interaction.kind !== 'work') {
        throw new Error(`Building ${workBuilding.id} cannot be used for work.`);
      }

      const remainingMs =
        interaction.durationMs.value - hero.activity.interactionElapsedMs;
      const activeMs = Math.min(deltaMs, remainingMs);
      const interactionElapsedMs = hero.activity.interactionElapsedMs + activeMs;
      hero = {
        ...hero,
        energy: Math.max(
          0,
          hero.energy - interaction.energyPerSecond.value * (activeMs / 1_000),
        ),
        activity: { ...hero.activity, interactionElapsedMs },
      };

      if (interactionElapsedMs >= interaction.durationMs.value) {
        const completion = completeWorkRound(hero, nextInventory, interaction, rng);
        hero = completion.hero;
        nextInventory = completion.inventory;
        const activity = hero.activity;
        if (activity.type !== 'WORKING') {
          throw new Error('Work completion lost the hero activity.');
        }

        const roundsCompleted = activity.roundsCompleted + 1;
        const canRepeat =
          roundsCompleted < interaction.maxRounds.value &&
          hero.energy >= requiredRoundEnergy(interaction);
        hero = {
          ...hero,
          activity: canRepeat
            ? {
                ...activity,
                interactionElapsedMs: 0,
                roundsCompleted,
              }
            : {
                type: 'SELECTING_WORK',
                buildingIds: activity.buildingIds,
                nextIndex: activity.nextIndex + 1,
              },
        };
      }
      break;
    }

    case 'IDLE':
    case 'SELECTING_WORK':
      throw new Error(`Unresolved timed activity for hero ${hero.id}.`);

    case 'TO_GUILD':
      if (state.expedition.active?.heroIds.includes(hero.id)) {
        const meetingPoint = getRegionDefinition(
          state.expedition.active.regionId,
        ).guildMeetingPoint;
        const position = moveToward(hero.position, meetingPoint, deltaMs);
        hero = {
          ...hero,
          position,
          activity: isAtPosition(position, meetingPoint)
            ? { type: 'WAITING_PARTY' }
            : hero.activity,
        };
      }
      break;
    case 'WAITING_PARTY':
    case 'EXPEDITION':
    case 'BOSS_READY':
    case 'BOSS_BATTLE':
      break;
  }

  hero = resolveImmediateActivity(
    {
      ...state,
      inventory: nextInventory,
    },
    hero,
  );
  return { hero, inventory: nextInventory };
};

const advanceStep = (state: GameState, deltaMs: number, rng: RandomSource): GameState => {
  const heroes = [...state.heroes];
  let inventory: Inventory = { items: { ...state.inventory.items } };

  for (let index = 0; index < heroes.length; index += 1) {
    const hero = heroes[index]!;
    if (hero.activity.type === 'UNPLACED' || hero.homeBuildingId === null) {
      heroes[index] =
        hero.activity.type === 'UNPLACED'
          ? hero
          : { ...hero, activity: { type: 'UNPLACED' } };
      continue;
    }
    const result = advanceHero(
      { ...state, heroes, inventory },
      hero,
      deltaMs,
      inventory,
      rng,
    );
    heroes[index] = result.hero;
    inventory = result.inventory;
  }

  return advanceExpedition(
    {
      ...state,
      heroes,
      inventory,
    },
    deltaMs,
  );
};

export function advance(state: GameState, deltaMs: number, rng: RandomSource): GameState {
  const clampedDeltaMs = Number.isFinite(deltaMs)
    ? Math.max(0, Math.min(deltaMs, simulationBalance.maxFrameDeltaMs))
    : 0;
  let nextState = state;
  let accumulatedMs = state.simulationRemainderMs + clampedDeltaMs;

  while (accumulatedMs >= simulationBalance.fixedStepMs) {
    nextState = advanceStep(nextState, simulationBalance.fixedStepMs, rng);
    accumulatedMs -= simulationBalance.fixedStepMs;
  }

  return {
    ...nextState,
    elapsedMs: state.elapsedMs + clampedDeltaMs,
    simulationRemainderMs: accumulatedMs,
  };
}
