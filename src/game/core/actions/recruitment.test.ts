import { growthBalance } from '@/game/balance/growth';
import { createNewGame } from '@/game/core/actions/newGame';
import { advance } from '@/game/core/simulation/advance';

import { RecruitmentError, assignHeroTent, recruitHero } from './recruitment';

describe('character recruitment and housing', () => {
  it('charges tickets and recruits one of three configured prototypes as unplaced', () => {
    const game = createNewGame();
    const next = recruitHero(game, () => 0);
    const recruited = next.heroes.at(-1)!;

    expect(recruited).toMatchObject({
      archetypeId: 'stonewarden',
      homeBuildingId: null,
      activity: { type: 'UNPLACED' },
      equipment: {},
      unlockedRuneNodeIds: [],
    });
    expect(next.inventory.items['recruit-ticket']).toBe(
      growthBalance.recruitment.initialTickets.value -
        growthBalance.recruitment.ticketCost.value,
    );
    expect(game.heroes).toHaveLength(3);
  });

  it('does not simulate work before a tent is assigned', () => {
    const recruited = recruitHero(createNewGame(), () => 0);
    const heroBefore = recruited.heroes.at(-1)!;
    const advanced = advance(recruited, 250, () => 0);
    const heroAfter = advanced.heroes.find((hero) => hero.id === heroBefore.id);

    expect(heroAfter).toEqual(heroBefore);
  });

  it('assigns an empty tent and activates the automatic work cycle', () => {
    const recruited = recruitHero(createNewGame(), () => 0);
    const hero = recruited.heroes.at(-1)!;
    const withEmptyTent = {
      ...recruited,
      fortress: {
        ...recruited.fortress,
        buildings: [
          ...recruited.fortress.buildings,
          {
            id: 'tent-recruit-01',
            definitionId: 'tent-basic' as const,
            position: { x: 7, y: 0 },
            ownerHeroId: null,
          },
        ],
      },
    };

    const assigned = assignHeroTent(withEmptyTent, hero.id, 'tent-recruit-01');

    expect(assigned.heroes.at(-1)).toMatchObject({
      homeBuildingId: 'tent-recruit-01',
      activity: { type: 'TO_REST', buildingId: 'tent-recruit-01' },
    });
    expect(assigned.fortress.buildings.at(-1)?.ownerHeroId).toBe(hero.id);
  });

  it('rejects recruitment without tickets and assignment to an occupied tent', () => {
    const game = createNewGame();
    const withoutTickets = {
      ...game,
      inventory: { items: { ...game.inventory.items, 'recruit-ticket': 0 } },
    };

    expect(() => recruitHero(withoutTickets, () => 0)).toThrow(RecruitmentError);
    const recruited = recruitHero(game, () => 0);
    expect(() =>
      assignHeroTent(recruited, recruited.heroes.at(-1)!.id, 'tent-aelan'),
    ).toThrow('该帐篷已有主人');
  });
});
