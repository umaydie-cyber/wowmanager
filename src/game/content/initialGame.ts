import type { Building, Inventory, WorkType } from '@/game/core/types';
import { growthBalance } from '@/game/balance/growth';

import { candidate, confirmed, type ConfigValue } from './valueStatus';

interface InitialBuildingDefinition extends Omit<
  Building,
  'position' | 'workPreference'
> {
  position: {
    x: ConfigValue<number>;
    y: ConfigValue<number>;
  };
  workPreference?: ConfigValue<WorkType>;
}

export const initialGameConfig = {
  fortress: {
    width: confirmed(8),
    height: confirmed(8),
  },
  buildings: [
    {
      id: 'tent-aelan',
      definitionId: 'tent-basic',
      position: { x: candidate(0), y: candidate(0) },
      ownerHeroId: 'hero-aelan',
      workPreference: candidate('gather'),
    },
    {
      id: 'tent-mira',
      definitionId: 'tent-basic',
      position: { x: candidate(0), y: candidate(2) },
      ownerHeroId: 'hero-mira',
      workPreference: candidate('gather'),
    },
    {
      id: 'tent-kern',
      definitionId: 'tent-basic',
      position: { x: candidate(0), y: candidate(4) },
      ownerHeroId: 'hero-kern',
      workPreference: candidate('training'),
    },
    {
      id: 'mine-01',
      definitionId: 'mine-basic',
      position: { x: candidate(3), y: candidate(0) },
      ownerHeroId: null,
    },
    {
      id: 'herb-garden-01',
      definitionId: 'herb-garden-basic',
      position: { x: candidate(3), y: candidate(3) },
      ownerHeroId: null,
    },
    {
      id: 'gym-01',
      definitionId: 'gym-basic',
      position: { x: candidate(6), y: candidate(5) },
      ownerHeroId: null,
    },
  ] satisfies readonly InitialBuildingDefinition[],
  inventory: candidate<Inventory>({
    items: {
      'copper-ore': 20,
      sunleaf: 20,
      'recruit-ticket': growthBalance.recruitment.initialTickets.value,
      'adamant-hammer-3-star': 1,
      'premium-plate': 2,
      'rune-dust': 12,
    },
  }),
} as const;
