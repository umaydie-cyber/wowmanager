import {
  getRuneNodeDefinition,
  runeResetConfig,
  runeTreeNodes,
} from '@/game/content/progression';
import type {
  GameState,
  Hero,
  HeroAttributes,
  HeroId,
  RuneChoiceId,
  RuneNodeId,
} from '@/game/core/types';

export class RuneCommandError extends Error {}

export const unlockRuneNode = (
  state: GameState,
  heroId: HeroId,
  nodeId: RuneNodeId,
  selectedChoiceId?: RuneChoiceId,
): GameState => {
  const hero = state.heroes.find((entry) => entry.id === heroId);
  if (hero === undefined) {
    throw new RuneCommandError('找不到目标角色。');
  }
  if (hero.unlockedRuneNodeIds.includes(nodeId)) {
    throw new RuneCommandError('该符文节点已经解锁。');
  }
  const node = getRuneNodeDefinition(nodeId);
  if (
    node.prerequisiteIds.some(
      (prerequisiteId) => !hero.unlockedRuneNodeIds.includes(prerequisiteId),
    )
  ) {
    throw new RuneCommandError('需要先解锁前置符文节点。');
  }
  if (hero.runePoints < node.runePointCost.value) {
    throw new RuneCommandError(`符文点不足，需要 ${node.runePointCost.value} 点。`);
  }
  if (
    node.kind === 'choice' &&
    (selectedChoiceId === undefined || !node.choicePoolIds?.includes(selectedChoiceId))
  ) {
    throw new RuneCommandError('第 5 个节点必须从配置候选中选择一个被动或技能。');
  }
  if (node.kind === 'attribute' && selectedChoiceId !== undefined) {
    throw new RuneCommandError('普通属性节点不接受额外选择。');
  }

  return {
    ...state,
    heroes: state.heroes.map((entry) =>
      entry.id === heroId
        ? {
            ...entry,
            runePoints: entry.runePoints - node.runePointCost.value,
            unlockedRuneNodeIds: [...entry.unlockedRuneNodeIds, nodeId],
            runeChoiceSelections:
              selectedChoiceId === undefined
                ? entry.runeChoiceSelections
                : { ...entry.runeChoiceSelections, [nodeId]: selectedChoiceId },
          }
        : entry,
    ),
  };
};

export const getRuneResetCost = (hero: Hero): number =>
  runeResetConfig.baseCost.value +
  hero.unlockedRuneNodeIds.length * runeResetConfig.costPerUnlockedNode.value;

export const resetRunes = (state: GameState, heroId: HeroId): GameState => {
  const hero = state.heroes.find((entry) => entry.id === heroId);
  if (hero === undefined) {
    throw new RuneCommandError('找不到目标角色。');
  }
  if (hero.unlockedRuneNodeIds.length === 0) {
    throw new RuneCommandError('当前没有可重置的符文节点。');
  }
  const resetCost = getRuneResetCost(hero);
  const itemId = runeResetConfig.itemId;
  if ((state.inventory.items[itemId] ?? 0) < resetCost) {
    throw new RuneCommandError(`符文尘不足，重置需要 ${resetCost}。`);
  }
  const refundedPoints = hero.unlockedRuneNodeIds.reduce(
    (sum, nodeId) => sum + getRuneNodeDefinition(nodeId).runePointCost.value,
    0,
  );
  return {
    ...state,
    inventory: {
      items: {
        ...state.inventory.items,
        [itemId]: (state.inventory.items[itemId] ?? 0) - resetCost,
      },
    },
    heroes: state.heroes.map((entry) =>
      entry.id === heroId
        ? {
            ...entry,
            runePoints: entry.runePoints + refundedPoints,
            unlockedRuneNodeIds: [],
            runeChoiceSelections: {},
          }
        : entry,
    ),
  };
};

export const calculateRuneAttributes = (hero: Hero): HeroAttributes => {
  const result: HeroAttributes = {
    stamina: 0,
    strength: 0,
    agility: 0,
    intelligence: 0,
    knowledge: 0,
  };
  for (const node of runeTreeNodes) {
    if (node.kind === 'attribute' && hero.unlockedRuneNodeIds.includes(node.id)) {
      result[node.line] += node.attributeBonus?.value ?? 0;
    }
  }
  return result;
};
