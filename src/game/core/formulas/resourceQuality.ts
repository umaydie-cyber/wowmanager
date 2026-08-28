import type { OreStar, RandomSource } from '@/game/core/types';

interface WeightedEntry {
  weight: { value: number };
}

export interface ResourceQualityTier {
  minimumSkill: { value: number };
  maximumSkill: { value: number };
  starWeights: readonly {
    stars: OreStar;
    weight: { value: number };
  }[];
}

const normalizedRandom = (rng: RandomSource): number => {
  const value = rng();
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(value, 0.999_999_999));
};

export const selectWeightedEntry = <Entry extends WeightedEntry>(
  entries: readonly Entry[],
  rng: RandomSource,
): Entry | undefined => {
  if (entries.length === 0) {
    return undefined;
  }

  const totalWeight = entries.reduce(
    (sum, entry) => sum + Math.max(0, entry.weight.value),
    0,
  );
  if (totalWeight <= 0) {
    return entries[entries.length - 1];
  }

  let roll = normalizedRandom(rng) * totalWeight;
  for (const entry of entries) {
    roll -= Math.max(0, entry.weight.value);
    if (roll < 0) {
      return entry;
    }
  }

  return entries[entries.length - 1];
};

export const rollResourceQuality = (
  skillLevel: number,
  tiers: readonly ResourceQualityTier[],
  rng: RandomSource,
): OreStar | undefined => {
  if (!Number.isFinite(skillLevel) || skillLevel < 0) {
    throw new RangeError('Resource skill level must be a non-negative number.');
  }

  const tier = tiers.find(
    (entry) =>
      skillLevel >= entry.minimumSkill.value && skillLevel <= entry.maximumSkill.value,
  );
  return tier === undefined
    ? undefined
    : selectWeightedEntry(tier.starWeights, rng)?.stars;
};
