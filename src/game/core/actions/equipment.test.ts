import { progressionFeatureFlags } from '@/game/content/featureFlags';
import { createNewGame } from '@/game/core/actions/newGame';

import {
  calculateEquipmentAttributes,
  completeEquipmentAscension,
  startEquipmentAscension,
} from './equipment';

describe('equipment progression', () => {
  it('calculates level-scaled base and affix attributes through level 350', () => {
    const attributes = calculateEquipmentAttributes({
      id: 'cap-test',
      definitionId: 'warden-helm',
      itemLevel: 350,
      qualityId: 'common',
      affixIds: ['steadfast'],
    });

    expect(attributes.stamina).toBe(52);
    expect(attributes.strength).toBe(0);
  });

  it('consumes three matching copies and persists three deterministic candidates', () => {
    const game = createNewGame();
    const rolls = [0, 0.49, 0.99];
    const pending = startEquipmentAscension(
      game,
      ['starter-helm-1', 'starter-helm-2', 'starter-helm-3'],
      'copies',
      3,
      () => rolls.shift() ?? 0,
    );

    expect(pending.equipmentInventory).toHaveLength(0);
    expect(pending.inventory.items['adamant-hammer-3-star']).toBe(0);
    expect(pending.progression.pendingEquipmentAscension).toMatchObject({
      targetQualityId: 'uncommon',
      candidateAffixIds: ['steadfast', 'nimble', 'learned'],
    });

    const completed = completeEquipmentAscension(pending, 'nimble');
    expect(completed.progression.pendingEquipmentAscension).toBeNull();
    expect(completed.equipmentInventory).toEqual([
      expect.objectContaining({
        qualityId: 'uncommon',
        affixIds: ['nimble'],
      }),
    ]);
  });

  it('uses configured premium plates as two replacement copies', () => {
    const next = startEquipmentAscension(
      createNewGame(),
      ['starter-helm-1'],
      'premium-plates',
      3,
      () => 0,
    );

    expect(next.equipmentInventory.map((entry) => entry.id)).toEqual([
      'starter-helm-2',
      'starter-helm-3',
    ]);
    expect(next.inventory.items['premium-plate']).toBe(0);
  });

  it('still offers all three 3-star candidates on the orange-to-red step', () => {
    const game = createNewGame();
    const legendaryCopies = [1, 2, 3].map((number) => ({
      id: `legendary-${number}`,
      definitionId: 'emberblade' as const,
      itemLevel: 350,
      qualityId: 'legendary' as const,
      affixIds: ['steadfast', 'forceful', 'nimble', 'insightful'] as const,
    }));
    const state = {
      ...game,
      equipmentInventory: legendaryCopies.map((entry) => ({
        ...entry,
        affixIds: [...entry.affixIds],
      })),
    };

    const next = startEquipmentAscension(
      state,
      legendaryCopies.map((entry) => entry.id),
      'copies',
      3,
      () => 0,
    );
    expect(next.progression.pendingEquipmentAscension).toMatchObject({
      targetQualityId: 'mythic',
    });
    expect(next.progression.pendingEquipmentAscension?.candidateAffixIds).toHaveLength(3);
  });

  it('keeps red-exclusive and post-campaign rules out of base ascension', () => {
    expect(progressionFeatureFlags).toEqual({
      mythicExclusiveAffixes: false,
      postCampaignMythicPlusOne: false,
      postMythicAffixRules: false,
    });
    const game = createNewGame();
    const mythicCopies = [1, 2, 3].map((number) => ({
      id: `mythic-${number}`,
      definitionId: 'warden-helm' as const,
      itemLevel: 350,
      qualityId: 'mythic' as const,
      affixIds: ['steadfast', 'forceful', 'nimble', 'insightful', 'learned'] as const,
    }));
    const state = {
      ...game,
      equipmentInventory: mythicCopies.map((entry) => ({
        ...entry,
        affixIds: [...entry.affixIds],
      })),
    };

    expect(() =>
      startEquipmentAscension(
        state,
        mythicCopies.map((entry) => entry.id),
        'copies',
        3,
        () => 0,
      ),
    ).toThrow('红色品质已是基础升阶上限');
  });
});
