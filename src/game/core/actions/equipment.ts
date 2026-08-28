import {
  equipmentAscensionConfig,
  getAffixDefinition,
  getEquipmentDefinition,
  getEquipmentQuality,
} from '@/game/content/progression';
import type {
  AffixId,
  EquipmentInstance,
  GameState,
  HeroAttributes,
  HeroId,
  RandomSource,
} from '@/game/core/types';

export class EquipmentCommandError extends Error {}

export type EquipmentMaterialMode = 'copies' | 'premium-plates';

const clampRoll = (value: number): number =>
  Number.isFinite(value) ? Math.min(Math.max(value, 0), 0.999_999) : 0;

const getInventoryInstances = (
  state: GameState,
  equipmentIds: readonly string[],
): EquipmentInstance[] => {
  const uniqueIds = [...new Set(equipmentIds)];
  if (uniqueIds.length !== equipmentIds.length) {
    throw new EquipmentCommandError('升阶素材不能重复选择。');
  }
  const instances = uniqueIds.map((id) =>
    state.equipmentInventory.find((entry) => entry.id === id),
  );
  if (instances.some((entry) => entry === undefined)) {
    throw new EquipmentCommandError('升阶素材必须位于要塞装备库中。');
  }
  return instances as EquipmentInstance[];
};

const assertMatchingCopies = (instances: readonly EquipmentInstance[]): void => {
  const first = instances[0];
  if (
    first === undefined ||
    instances.some(
      (entry) =>
        entry.definitionId !== first.definitionId ||
        entry.qualityId !== first.qualityId ||
        entry.itemLevel !== first.itemLevel,
    )
  ) {
    throw new EquipmentCommandError('3 合 1 需要同款、同品质、同等级装备。');
  }
};

const rollDistinctAffixes = (
  pool: readonly AffixId[],
  count: number,
  rng: RandomSource,
): AffixId[] => {
  const remaining = [...pool];
  const result: AffixId[] = [];
  while (result.length < count && remaining.length > 0) {
    const index = Math.floor(clampRoll(rng()) * remaining.length);
    result.push(remaining.splice(index, 1)[0]!);
  }
  return result;
};

export const startEquipmentAscension = (
  state: GameState,
  equipmentIds: readonly string[],
  materialMode: EquipmentMaterialMode,
  hammerStars: 1 | 2 | 3,
  rng: RandomSource,
): GameState => {
  if (state.progression.pendingEquipmentAscension !== null) {
    throw new EquipmentCommandError('请先完成当前装备升阶选择。');
  }

  const requiredCopies = equipmentAscensionConfig.copiesRequired.value;
  const expectedEquipmentCount = materialMode === 'copies' ? requiredCopies : 1;
  if (equipmentIds.length !== expectedEquipmentCount) {
    throw new EquipmentCommandError(
      materialMode === 'copies'
        ? '同款升阶必须选择 3 件装备。'
        : '氪金板升阶必须选择 1 件本体。',
    );
  }
  const instances = getInventoryInstances(state, equipmentIds);
  assertMatchingCopies(instances);
  const base = instances[0]!;
  if (
    base.itemLevel < 1 ||
    base.itemLevel > equipmentAscensionConfig.maximumItemLevel.value
  ) {
    throw new EquipmentCommandError('装备等级必须在 1–350 之间。');
  }

  const qualityIndex = equipmentAscensionConfig.qualityOrder.indexOf(base.qualityId);
  const targetQualityId = equipmentAscensionConfig.qualityOrder[qualityIndex + 1];
  if (targetQualityId === undefined) {
    throw new EquipmentCommandError('红色品质已是基础升阶上限。');
  }

  const items = { ...state.inventory.items };
  const hammerItemId = equipmentAscensionConfig.hammerItemByStars[hammerStars];
  if ((items[hammerItemId] ?? 0) < 1) {
    throw new EquipmentCommandError(`缺少 ${hammerStars}★ 精金锤。`);
  }
  items[hammerItemId] = (items[hammerItemId] ?? 0) - 1;

  if (materialMode === 'premium-plates') {
    const replacedCopies = requiredCopies - 1;
    const platesRequired = Math.ceil(
      replacedCopies / equipmentAscensionConfig.premiumPlate.copiesReplacedPerPlate.value,
    );
    if (
      replacedCopies >
        equipmentAscensionConfig.premiumPlate.maximumReplacedCopies.value ||
      (items[equipmentAscensionConfig.premiumPlate.itemId] ?? 0) < platesRequired
    ) {
      throw new EquipmentCommandError(`氪金板不足，需要 ${platesRequired} 块。`);
    }
    items[equipmentAscensionConfig.premiumPlate.itemId] =
      (items[equipmentAscensionConfig.premiumPlate.itemId] ?? 0) - platesRequired;
  }

  const targetQuality = getEquipmentQuality(targetQualityId);
  const retainedAffixIds = base.affixIds.slice(0, targetQuality.affixCount.value - 1);
  const candidatePool = targetQuality.affixPoolIds.filter(
    (affixId) => !retainedAffixIds.includes(affixId),
  );
  const candidateAffixIds = rollDistinctAffixes(candidatePool, hammerStars, rng);
  if (candidateAffixIds.length === 0) {
    throw new EquipmentCommandError('当前品质没有可用的新词条。');
  }
  const consumedIds = new Set(equipmentIds);

  return {
    ...state,
    inventory: { items },
    equipmentInventory: state.equipmentInventory.filter(
      (entry) => !consumedIds.has(entry.id),
    ),
    progression: {
      ...state.progression,
      nextEquipmentInstanceNumber: state.progression.nextEquipmentInstanceNumber + 1,
      pendingEquipmentAscension: {
        outputInstanceId: `ascended-${state.progression.nextEquipmentInstanceNumber}`,
        definitionId: base.definitionId,
        itemLevel: base.itemLevel,
        targetQualityId,
        retainedAffixIds,
        candidateAffixIds,
      },
    },
  };
};

export const completeEquipmentAscension = (
  state: GameState,
  selectedAffixId: AffixId,
): GameState => {
  const pending = state.progression.pendingEquipmentAscension;
  if (pending === null || !pending.candidateAffixIds.includes(selectedAffixId)) {
    throw new EquipmentCommandError('请选择本次已明确生成的词条候选。');
  }
  const targetAffixCount = getEquipmentQuality(pending.targetQualityId).affixCount.value;
  const output: EquipmentInstance = {
    id: pending.outputInstanceId,
    definitionId: pending.definitionId,
    itemLevel: pending.itemLevel,
    qualityId: pending.targetQualityId,
    affixIds: [...pending.retainedAffixIds, selectedAffixId].slice(0, targetAffixCount),
  };
  return {
    ...state,
    equipmentInventory: [...state.equipmentInventory, output],
    progression: { ...state.progression, pendingEquipmentAscension: null },
  };
};

export const equipItem = (
  state: GameState,
  heroId: HeroId,
  equipmentId: string,
): GameState => {
  const instance = state.equipmentInventory.find((entry) => entry.id === equipmentId);
  if (instance === undefined) {
    throw new EquipmentCommandError('装备不在要塞装备库中。');
  }
  const slotId = getEquipmentDefinition(instance.definitionId).slotId;
  const hero = state.heroes.find((entry) => entry.id === heroId);
  if (hero === undefined) {
    throw new EquipmentCommandError('找不到目标角色。');
  }
  const replaced = hero.equipment[slotId];
  return {
    ...state,
    equipmentInventory: [
      ...state.equipmentInventory.filter((entry) => entry.id !== equipmentId),
      ...(replaced === undefined ? [] : [replaced]),
    ],
    heroes: state.heroes.map((entry) =>
      entry.id === heroId
        ? { ...entry, equipment: { ...entry.equipment, [slotId]: instance } }
        : entry,
    ),
  };
};

const emptyAttributes = (): HeroAttributes => ({
  stamina: 0,
  strength: 0,
  agility: 0,
  intelligence: 0,
  knowledge: 0,
});

export const calculateEquipmentAttributes = (
  instance: EquipmentInstance,
): HeroAttributes => {
  const result = emptyAttributes();
  const definition = getEquipmentDefinition(instance.definitionId);
  const quality = getEquipmentQuality(instance.qualityId);
  const itemLevel = Math.min(
    Math.max(Math.trunc(instance.itemLevel), 1),
    equipmentAscensionConfig.maximumItemLevel.value,
  );
  result[definition.baseAttribute] = Math.floor(
    (definition.levelOneValue.value + (itemLevel - 1) * definition.valuePerLevel.value) *
      quality.powerMultiplier.value,
  );
  for (const affixId of instance.affixIds) {
    const affix = getAffixDefinition(affixId);
    const ratio = (itemLevel - 1) / (equipmentAscensionConfig.maximumItemLevel.value - 1);
    result[affix.attribute] += Math.round(
      affix.minimumRoll.value +
        ratio * (affix.maximumRoll.value - affix.minimumRoll.value),
    );
  }
  return result;
};

export const calculateHeroEquipmentAttributes = (
  equipment: Readonly<Partial<Record<string, EquipmentInstance>>>,
): HeroAttributes =>
  Object.values(equipment).reduce((total, instance) => {
    if (instance === undefined) {
      return total;
    }
    const bonus = calculateEquipmentAttributes(instance);
    for (const attribute of Object.keys(total) as (keyof HeroAttributes)[]) {
      total[attribute] += bonus[attribute];
    }
    return total;
  }, emptyAttributes());
