import { deriveHeroAttributes } from './attributes';

describe('deriveHeroAttributes', () => {
  it('derives linear health and power values from centralized balance', () => {
    const result = deriveHeroAttributes({
      stamina: 5,
      strength: 5,
      agility: 5,
      intelligence: 5,
      knowledge: 5,
    });

    expect(result.maxHealth).toBe(160);
    expect(result.physicalPower).toBe(20);
    expect(result.agilePower).toBe(20);
    expect(result.spellPower).toBe(20);
    expect(result.healingPower).toBe(20);
    expect(result.focusGain).toBe(7.5);
  });

  it('soft-caps avoidance and reductions below their configured ceilings', () => {
    const result = deriveHeroAttributes({
      stamina: 0,
      strength: 10_000,
      agility: 10_000,
      intelligence: 10_000,
      knowledge: 0,
    });

    expect(result.physicalDamageReduction).toBeLessThan(0.45);
    expect(result.spellDamageReduction).toBeLessThan(0.45);
    expect(result.dodgeChance).toBeLessThan(0.35);
    expect(result.physicalDamageReduction).toBeGreaterThan(0.44);
  });
});
