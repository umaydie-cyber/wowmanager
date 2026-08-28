import type { HeroAttributes, InventoryItemId, OreStar } from '@/game/core/types';

import { candidate } from '@/game/content/valueStatus';

export const growthBalance = {
  experience: {
    professionSkillCap: candidate(300),
    levelsPerCostBand: candidate(50),
    baseExperiencePerLevel: candidate(100),
  },
  derivedAttributes: {
    baseHealth: candidate(100),
    healthPerStamina: candidate(12),
    basePower: candidate(10),
    powerPerPrimaryAttribute: candidate(2),
    physicalReductionPerStrength: candidate(0.006),
    physicalReductionCap: candidate(0.45),
    dodgePerAgility: candidate(0.004),
    dodgeCap: candidate(0.35),
    spellReductionPerIntelligence: candidate(0.006),
    spellReductionCap: candidate(0.45),
    focusPerKnowledge: candidate(1.5),
  },
  recruitment: {
    ticketItemId: 'recruit-ticket' as const satisfies InventoryItemId,
    ticketCost: candidate(1),
    initialTickets: candidate(3),
    initialEnergy: candidate(0),
    maxEnergy: candidate(30),
    waitingPosition: { x: candidate(7), y: candidate(0) },
  },
  resourceQuality: {
    mining: [
      {
        minimumSkill: candidate(0),
        maximumSkill: candidate(49),
        starWeights: [
          { stars: 1, weight: candidate(75) },
          { stars: 2, weight: candidate(23) },
          { stars: 3, weight: candidate(2) },
        ],
      },
      {
        minimumSkill: candidate(50),
        maximumSkill: candidate(149),
        starWeights: [
          { stars: 1, weight: candidate(55) },
          { stars: 2, weight: candidate(38) },
          { stars: 3, weight: candidate(7) },
        ],
      },
      {
        minimumSkill: candidate(150),
        maximumSkill: candidate(249),
        starWeights: [
          { stars: 1, weight: candidate(35) },
          { stars: 2, weight: candidate(50) },
          { stars: 3, weight: candidate(15) },
        ],
      },
      {
        minimumSkill: candidate(250),
        maximumSkill: candidate(300),
        starWeights: [
          { stars: 1, weight: candidate(20) },
          { stars: 2, weight: candidate(55) },
          { stars: 3, weight: candidate(25) },
        ],
      },
    ] satisfies readonly {
      minimumSkill: { value: number };
      maximumSkill: { value: number };
      starWeights: readonly { stars: OreStar; weight: { value: number } }[];
    }[],
  },
} as const;

export type AttributeKey = keyof HeroAttributes;
