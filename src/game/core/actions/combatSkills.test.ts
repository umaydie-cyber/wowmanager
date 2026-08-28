import { createNewGame } from './newGame';
import { grantCombatLevels, rerollCombatSkill } from './combatSkills';

describe('combat-skill progression', () => {
  it('records deterministic milestone rolls as explicit results', () => {
    const next = grantCombatLevels(createNewGame(), 'hero-aelan', 4, () => 0.99);
    expect(next.heroes[0]).toMatchObject({
      combatLevel: 5,
      runePoints: 11,
      combatSkillIds: ['guarding-strike', 'shield-slam'],
      combatSkillRollHistory: [
        {
          source: 'milestone',
          milestoneLevel: 5,
          resultSkillId: 'shield-slam',
        },
      ],
    });
  });

  it('requires the insight facility and spends insight points to reroll one skill', () => {
    const leveled = grantCombatLevels(createNewGame(), 'hero-aelan', 4, () => 0.99);
    expect(() =>
      rerollCombatSkill(leveled, 'hero-aelan', 'shield-slam', () => 0),
    ).toThrow('顿悟圣坛');

    const withShrine = {
      ...leveled,
      fortress: {
        ...leveled.fortress,
        buildings: [
          ...leveled.fortress.buildings,
          {
            id: 'insight-test',
            definitionId: 'insight-shrine-basic' as const,
            position: { x: 5, y: 0 },
            ownerHeroId: null,
          },
        ],
      },
    };
    const result = rerollCombatSkill(withShrine, 'hero-aelan', 'shield-slam', () => 0);

    expect(result.progression.insightPoints).toBe(2);
    expect(result.heroes[0]?.combatSkillIds).toEqual(['guarding-strike', 'stone-rally']);
    expect(result.heroes[0]?.combatSkillRollHistory.at(-1)).toEqual({
      source: 'insight',
      previousSkillId: 'shield-slam',
      resultSkillId: 'stone-rally',
    });
  });
});
