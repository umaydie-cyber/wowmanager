import { growthBalance } from '@/game/balance/growth';

import { rollResourceQuality, selectWeightedEntry } from './resourceQuality';

describe('resource quality formulas', () => {
  it('uses the configured skill tier and deterministic weighted boundaries', () => {
    const tiers = growthBalance.resourceQuality.mining;

    expect(rollResourceQuality(0, tiers, () => 0)).toBe(1);
    expect(rollResourceQuality(0, tiers, () => 0.75)).toBe(2);
    expect(rollResourceQuality(250, tiers, () => 0.75)).toBe(3);
  });

  it('clamps an injected RNG and rejects invalid skill values', () => {
    const entries = [
      { id: 'first', weight: { value: 1 } },
      { id: 'second', weight: { value: 1 } },
    ] as const;

    expect(selectWeightedEntry(entries, () => Number.NaN)?.id).toBe('first');
    expect(selectWeightedEntry(entries, () => 5)?.id).toBe('second');
    expect(() =>
      rollResourceQuality(-1, growthBalance.resourceQuality.mining, () => 0),
    ).toThrow(RangeError);
  });
});
