import { createNewGame } from './newGame';
import { setHeroWorkPreference } from './setHeroWorkPreference';

describe('setHeroWorkPreference', () => {
  it('stores the selected preference on the hero’s own tent and restarts the cycle', () => {
    const state = createNewGame();
    const next = setHeroWorkPreference(state, 'hero-aelan', 'training');

    expect(next.heroes.find((hero) => hero.id === 'hero-aelan')).toMatchObject({
      workPreference: 'training',
      activity: { type: 'TO_REST', buildingId: 'tent-aelan' },
    });
    expect(
      next.fortress.buildings.find((building) => building.id === 'tent-aelan')
        ?.workPreference,
    ).toBe('training');
    expect(
      next.fortress.buildings.find((building) => building.id === 'tent-mira')
        ?.workPreference,
    ).toBe('gather');
  });
});
