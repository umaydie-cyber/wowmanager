import { initialHeroDefinitions } from '@/game/content/heroes';
import { initialGameConfig } from '@/game/content/initialGame';
import { getProfessionArchetype, runePointConfig } from '@/game/content/progression';
import {
  GAME_SCHEMA_VERSION,
  type GameState,
  type Hero,
  type SkillId,
  type SkillProgress,
} from '@/game/core/types';

const createSkillProgress = (skillId: SkillId, level: number): SkillProgress => ({
  skillId,
  kind: skillId === 'staminaTraining' ? 'training' : 'profession',
  level,
  xp: 0,
});

const createHero = (definition: (typeof initialHeroDefinitions)[number]): Hero => {
  const archetype = getProfessionArchetype(definition.archetypeId);
  return {
    id: definition.id,
    name: definition.name,
    archetypeId: definition.archetypeId,
    position: {
      x: definition.initialPosition.x.value,
      y: definition.initialPosition.y.value,
    },
    energy: definition.initialEnergy.value,
    maxEnergy: definition.maxEnergy.value,
    attributes: {
      stamina: definition.attributes.stamina.value,
      strength: definition.attributes.strength.value,
      agility: definition.attributes.agility.value,
      intelligence: definition.attributes.intelligence.value,
      knowledge: definition.attributes.knowledge.value,
    },
    skills: {
      mining: createSkillProgress('mining', definition.initialSkillLevels.mining.value),
      herbalism: createSkillProgress(
        'herbalism',
        definition.initialSkillLevels.herbalism.value,
      ),
      staminaTraining: createSkillProgress(
        'staminaTraining',
        definition.initialSkillLevels.staminaTraining.value,
      ),
    },
    homeBuildingId: definition.homeBuildingId,
    workPreference: definition.workPreference.value,
    activity: { type: 'IDLE' },
    combatLevel: 1,
    combatSkillIds: [...archetype.startingSkillIds],
    combatSkillRollHistory: [],
    equipment: {},
    unlockedRuneNodeIds: [],
    runeChoiceSelections: {},
    runePoints: runePointConfig.initialPoints.value,
  };
};

export function createNewGame(): GameState {
  return {
    schemaVersion: GAME_SCHEMA_VERSION,
    elapsedMs: 0,
    simulationRemainderMs: 0,
    fortress: {
      width: initialGameConfig.fortress.width.value,
      height: initialGameConfig.fortress.height.value,
      buildings: initialGameConfig.buildings.map((building) => ({
        id: building.id,
        definitionId: building.definitionId,
        position: {
          x: building.position.x.value,
          y: building.position.y.value,
        },
        ownerHeroId: building.ownerHeroId,
        ...(building.workPreference === undefined
          ? {}
          : { workPreference: building.workPreference.value }),
      })),
    },
    heroes: initialHeroDefinitions.map(createHero),
    inventory: {
      items: { ...initialGameConfig.inventory.value.items },
    },
    equipmentInventory: [
      {
        id: 'starter-helm-1',
        definitionId: 'warden-helm',
        itemLevel: 50,
        qualityId: 'common',
        affixIds: [],
      },
      {
        id: 'starter-helm-2',
        definitionId: 'warden-helm',
        itemLevel: 50,
        qualityId: 'common',
        affixIds: [],
      },
      {
        id: 'starter-helm-3',
        definitionId: 'warden-helm',
        itemLevel: 50,
        qualityId: 'common',
        affixIds: [],
      },
    ],
    progression: {
      insightPoints: 3,
      nextEquipmentInstanceNumber: 1,
      pendingEquipmentAscension: null,
    },
    expedition: {
      regionProgress: {
        'ember-hollow': {
          completedWaveCount: 0,
          bossDefeated: false,
          victoryCount: 0,
        },
        frostmarch: { completedWaveCount: 0, bossDefeated: false, victoryCount: 0 },
        'astral-rift': {
          completedWaveCount: 0,
          bossDefeated: false,
          victoryCount: 0,
        },
      },
      active: null,
    },
  };
}
