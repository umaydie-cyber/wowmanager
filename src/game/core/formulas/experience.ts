import { growthBalance } from '@/game/balance/growth';
import type { SkillProgress } from '@/game/core/types';

export function xpToNext(level: number): number {
  if (!Number.isInteger(level) || level < 0) {
    throw new RangeError('Skill level must be a non-negative integer.');
  }

  return (
    growthBalance.experience.baseExperiencePerLevel.value *
    (Math.floor(level / growthBalance.experience.levelsPerCostBand.value) + 1)
  );
}

export function addSkillExperience(
  progress: SkillProgress,
  experience: number,
): SkillProgress {
  if (!Number.isFinite(experience) || experience < 0) {
    throw new RangeError('Experience must be a non-negative finite number.');
  }

  const cap =
    progress.kind === 'profession'
      ? growthBalance.experience.professionSkillCap.value
      : Infinity;
  if (progress.level >= cap) {
    return { ...progress, level: cap, xp: 0 };
  }

  let level = progress.level;
  let xp = progress.xp + experience;

  while (level < cap && xp >= xpToNext(level)) {
    xp -= xpToNext(level);
    level += 1;
  }

  if (level >= cap) {
    return { ...progress, level: cap, xp: 0 };
  }

  return { ...progress, level, xp };
}
