import type {
  HeroAttributes,
  HeroId,
  ProfessionArchetypeId,
  SkillId,
  WorkType,
} from '@/game/core/types';

import { candidate, type ConfigValue } from './valueStatus';

export interface InitialHeroDefinition {
  id: HeroId;
  name: string;
  archetypeId: ProfessionArchetypeId;
  homeBuildingId: string;
  workPreference: ConfigValue<WorkType>;
  initialEnergy: ConfigValue<number>;
  maxEnergy: ConfigValue<number>;
  initialPosition: {
    x: ConfigValue<number>;
    y: ConfigValue<number>;
  };
  attributes: Record<keyof HeroAttributes, ConfigValue<number>>;
  initialSkillLevels: Record<SkillId, ConfigValue<number>>;
}

const candidateAttributes = (): Record<keyof HeroAttributes, ConfigValue<number>> => ({
  stamina: candidate(5),
  strength: candidate(5),
  agility: candidate(5),
  intelligence: candidate(5),
  knowledge: candidate(5),
});

const candidateSkillLevels = (): Record<SkillId, ConfigValue<number>> => ({
  mining: candidate(0),
  herbalism: candidate(0),
  staminaTraining: candidate(0),
});

export const initialHeroDefinitions = [
  {
    id: 'hero-aelan',
    name: '艾澜',
    archetypeId: 'stonewarden',
    homeBuildingId: 'tent-aelan',
    workPreference: candidate('gather'),
    initialEnergy: candidate(0),
    maxEnergy: candidate(30),
    initialPosition: { x: candidate(0), y: candidate(0) },
    attributes: candidateAttributes(),
    initialSkillLevels: candidateSkillLevels(),
  },
  {
    id: 'hero-mira',
    name: '米菈',
    archetypeId: 'windstrider',
    homeBuildingId: 'tent-mira',
    workPreference: candidate('gather'),
    initialEnergy: candidate(0),
    maxEnergy: candidate(30),
    initialPosition: { x: candidate(0), y: candidate(2) },
    attributes: candidateAttributes(),
    initialSkillLevels: candidateSkillLevels(),
  },
  {
    id: 'hero-kern',
    name: '柯恩',
    archetypeId: 'starweaver',
    homeBuildingId: 'tent-kern',
    workPreference: candidate('training'),
    initialEnergy: candidate(0),
    maxEnergy: candidate(30),
    initialPosition: { x: candidate(0), y: candidate(4) },
    attributes: candidateAttributes(),
    initialSkillLevels: candidateSkillLevels(),
  },
] as const satisfies readonly InitialHeroDefinition[];
