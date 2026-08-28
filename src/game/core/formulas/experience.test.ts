import { growthBalance } from '@/game/balance/growth';
import type { SkillProgress } from '@/game/core/types';

import { addSkillExperience, xpToNext } from './experience';

describe('xpToNext', () => {
  it.each([
    [0, 100],
    [49, 100],
    [50, 200],
    [99, 200],
    [300, 700],
  ])('returns the configured threshold at level %i', (level, expected) => {
    expect(xpToNext(level)).toBe(expected);
  });

  it('rejects invalid levels', () => {
    expect(() => xpToNext(-1)).toThrow(RangeError);
    expect(() => xpToNext(1.5)).toThrow(RangeError);
  });
});

describe('addSkillExperience', () => {
  it('stops a profession at 300 and discards overflow experience', () => {
    const professionSkillCap = growthBalance.experience.professionSkillCap.value;
    const progress: SkillProgress = {
      skillId: 'mining',
      kind: 'profession',
      level: professionSkillCap - 1,
      xp: 0,
    };

    expect(addSkillExperience(progress, 10_000)).toEqual({
      ...progress,
      level: professionSkillCap,
      xp: 0,
    });
  });

  it('allows training progress above the profession cap', () => {
    const professionSkillCap = growthBalance.experience.professionSkillCap.value;
    const progress: SkillProgress = {
      skillId: 'staminaTraining',
      kind: 'training',
      level: professionSkillCap,
      xp: 0,
    };

    expect(addSkillExperience(progress, xpToNext(professionSkillCap))).toEqual({
      ...progress,
      level: professionSkillCap + 1,
      xp: 0,
    });
  });
});
