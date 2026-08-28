import { create, type StoreApi, type UseBoundStore } from 'zustand';

import {
  FortressCommandError,
  demolishBuilding,
  moveBuilding,
  placeBuilding,
} from '@/game/core/actions/fortress';
import {
  RecruitmentError,
  assignHeroTent as assignHeroTentCommand,
  recruitHero as recruitHeroCommand,
} from '@/game/core/actions/recruitment';
import { setHeroWorkPreference } from '@/game/core/actions/setHeroWorkPreference';
import {
  completeEquipmentAscension as completeEquipmentAscensionCommand,
  equipItem as equipItemCommand,
  startEquipmentAscension as startEquipmentAscensionCommand,
  type EquipmentMaterialMode,
} from '@/game/core/actions/equipment';
import {
  resetRunes as resetRunesCommand,
  unlockRuneNode as unlockRuneNodeCommand,
} from '@/game/core/actions/runes';
import { rerollCombatSkill as rerollCombatSkillCommand } from '@/game/core/actions/combatSkills';
import {
  closeExpeditionResult,
  dispatchExpedition,
  markBossBattleStarted,
  resolveBossVictory,
} from '@/game/core/actions/expedition';
import {
  getAffixDefinition,
  getCombatSkillDefinition,
  getEquipmentDefinition,
  getProfessionArchetype,
} from '@/game/content/progression';
import { getRegionDefinition } from '@/game/content/regions';
import { advance } from '@/game/core/simulation/advance';
import type {
  BuildingDefinitionId,
  BuildingId,
  AffixId,
  CombatSkillId,
  GameState,
  HeroId,
  Position,
  RandomSource,
  RegionId,
  RuneChoiceId,
  RuneNodeId,
  SaveFile,
  WorkType,
} from '@/game/core/types';
import { saveRepository, type IndexedDbSaveRepository } from '@/persistence/database';

type StoreOperation =
  'idle' | 'creating' | 'saving' | 'loading' | 'exporting' | 'importing' | 'resetting';

interface SaveRepository {
  newGame(savedAtEpochMs: number): Promise<SaveFile>;
  save(game: GameState, savedAtEpochMs: number): Promise<SaveFile>;
  load(): Promise<SaveFile | null>;
  exportJson(): Promise<string>;
  importJson(json: string): Promise<SaveFile>;
  clear(): Promise<void>;
}

export interface GameStoreDependencies {
  repository: SaveRepository;
  now: () => number;
  rng: RandomSource;
}

export interface GameStoreState {
  gameState: GameState | null;
  operation: StoreOperation;
  message: string;
  createNewGame: () => Promise<void>;
  saveGame: () => Promise<void>;
  loadGame: () => Promise<void>;
  exportSave: () => Promise<string | null>;
  importSave: (json: string) => Promise<boolean>;
  resetSave: () => Promise<boolean>;
  advanceBy: (deltaMs: number, reportProgress?: boolean) => void;
  changeWorkPreference: (heroId: HeroId, preference: WorkType) => void;
  startEquipmentAscension: (
    equipmentIds: readonly string[],
    materialMode: EquipmentMaterialMode,
    hammerStars: 1 | 2 | 3,
  ) => boolean;
  completeEquipmentAscension: (affixId: AffixId) => boolean;
  equipItem: (heroId: HeroId, equipmentId: string) => boolean;
  unlockRuneNode: (
    heroId: HeroId,
    nodeId: RuneNodeId,
    choiceId?: RuneChoiceId,
  ) => boolean;
  resetRunes: (heroId: HeroId) => boolean;
  rerollCombatSkill: (heroId: HeroId, skillId: CombatSkillId) => boolean;
  dispatchRegion: (regionId: RegionId, heroIds: readonly HeroId[]) => boolean;
  startBossBattle: () => boolean;
  winBossBattle: () => boolean;
  closeExpedition: () => boolean;
  recruitHero: () => boolean;
  assignHeroTent: (heroId: HeroId, buildingId: BuildingId) => boolean;
  buildBuilding: (definitionId: BuildingDefinitionId, position: Position) => boolean;
  moveBuilding: (buildingId: BuildingId, position: Position) => boolean;
  demolishBuilding: (buildingId: BuildingId) => boolean;
  undoFortressCommand: () => void;
  undoStack: readonly GameState[];
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : '发生未知错误。';

export function createGameStore(
  dependencies: GameStoreDependencies,
): UseBoundStore<StoreApi<GameStoreState>> {
  let persistenceQueue: Promise<void> = Promise.resolve();
  let lastAutomaticSaveElapsedMs = 0;

  const runPersistenceTask = <Result>(task: () => Promise<Result>): Promise<Result> => {
    const result = persistenceQueue.catch(() => undefined).then(task);
    persistenceQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };

  const persistGame = (game: GameState, set: StoreApi<GameStoreState>['setState']) => {
    void runPersistenceTask(async () => {
      await dependencies.repository.save(game, dependencies.now());
    }).catch((error: unknown) => {
      set({ message: `自动保存失败：${errorMessage(error)}` });
    });
  };

  const nextBuildingId = (
    game: GameState,
    definitionId: BuildingDefinitionId,
  ): BuildingId => {
    const prefix = `${definitionId.replace(/-basic$/, '')}-`;
    let number = 1;
    let id = `${prefix}${String(number).padStart(2, '0')}`;

    while (game.fortress.buildings.some((building) => building.id === id)) {
      number += 1;
      id = `${prefix}${String(number).padStart(2, '0')}`;
    }

    return id;
  };

  const commitFortressCommand = (
    get: () => GameStoreState,
    set: StoreApi<GameStoreState>['setState'],
    command: (game: GameState) => GameState,
    successMessage: string,
  ): boolean => {
    const current = get().gameState;
    if (current === null) {
      set({ message: '请先创建或加载游戏。' });
      return false;
    }

    try {
      const next = command(current);
      set((state) => ({
        gameState: next,
        undoStack: [...state.undoStack, current],
        message: successMessage,
      }));
      persistGame(next, set);
      return true;
    } catch (error) {
      const message =
        error instanceof FortressCommandError
          ? error.message
          : `操作失败：${errorMessage(error)}`;
      set({ message });
      return false;
    }
  };

  const commitPersistentCommand = (
    get: () => GameStoreState,
    set: StoreApi<GameStoreState>['setState'],
    command: (game: GameState) => GameState,
    successMessage: string | ((game: GameState) => string),
  ): boolean => {
    const current = get().gameState;
    if (current === null) {
      set({ message: '请先创建或加载游戏。' });
      return false;
    }

    try {
      const next = command(current);
      set({
        gameState: next,
        message:
          typeof successMessage === 'function' ? successMessage(next) : successMessage,
      });
      persistGame(next, set);
      return true;
    } catch (error) {
      set({
        message:
          error instanceof RecruitmentError
            ? error.message
            : `操作失败：${errorMessage(error)}`,
      });
      return false;
    }
  };

  return create<GameStoreState>((set, get) => ({
    gameState: null,
    operation: 'idle',
    message: '',
    undoStack: [],

    createNewGame: async () => {
      set({ operation: 'creating', message: '正在创建新游戏……' });
      try {
        const file = await runPersistenceTask(() =>
          dependencies.repository.newGame(dependencies.now()),
        );
        set({
          gameState: file.game,
          operation: 'idle',
          message: '新游戏已创建并保存。',
          undoStack: [],
        });
        lastAutomaticSaveElapsedMs = file.game.elapsedMs;
      } catch (error) {
        set({ operation: 'idle', message: `创建失败：${errorMessage(error)}` });
      }
    },

    saveGame: async () => {
      const game = get().gameState;
      if (game === null) {
        set({ message: '当前没有可保存的游戏。' });
        return;
      }

      set({ operation: 'saving', message: '正在保存……' });
      try {
        await runPersistenceTask(() =>
          dependencies.repository.save(game, dependencies.now()),
        );
        lastAutomaticSaveElapsedMs = game.elapsedMs;
        set({ operation: 'idle', message: '本地存档已保存。' });
      } catch (error) {
        set({ operation: 'idle', message: `保存失败：${errorMessage(error)}` });
      }
    },

    loadGame: async () => {
      const gameBeforeLoad = get().gameState;
      set({ operation: 'loading', message: '正在加载……' });
      try {
        const file = await runPersistenceTask(() => dependencies.repository.load());
        if (get().operation !== 'loading' || get().gameState !== gameBeforeLoad) {
          return;
        }
        set({
          gameState: file?.game ?? gameBeforeLoad,
          operation: 'idle',
          message: file === null ? '没有找到本地存档。' : '本地存档已加载。',
          undoStack: [],
        });
        lastAutomaticSaveElapsedMs = (file?.game ?? gameBeforeLoad)?.elapsedMs ?? 0;
      } catch (error) {
        set({ operation: 'idle', message: `加载失败：${errorMessage(error)}` });
      }
    },

    exportSave: async () => {
      set({ operation: 'exporting', message: '正在保存并导出……' });
      try {
        const game = get().gameState;
        const transferJson = await runPersistenceTask(async () => {
          if (game !== null) {
            await dependencies.repository.save(game, dependencies.now());
          }
          return dependencies.repository.exportJson();
        });
        if (game !== null) {
          lastAutomaticSaveElapsedMs = game.elapsedMs;
        }
        set({ operation: 'idle', message: '存档已导出到下载文件。' });
        return transferJson;
      } catch (error) {
        set({ operation: 'idle', message: `导出失败：${errorMessage(error)}` });
        return null;
      }
    },

    importSave: async (json) => {
      set({ operation: 'importing', message: '正在校验并导入……' });
      try {
        const file = await runPersistenceTask(() =>
          dependencies.repository.importJson(json),
        );
        set({
          gameState: file.game,
          operation: 'idle',
          message: '存档 JSON 已导入。',
          undoStack: [],
        });
        lastAutomaticSaveElapsedMs = file.game.elapsedMs;
        return true;
      } catch (error) {
        set({
          operation: 'idle',
          message: `导入失败，原存档未改变：${errorMessage(error)}`,
        });
        return false;
      }
    },

    resetSave: async () => {
      set({ operation: 'resetting', message: '正在重置本地存档……' });
      try {
        await runPersistenceTask(() => dependencies.repository.clear());
        lastAutomaticSaveElapsedMs = 0;
        set({
          gameState: null,
          operation: 'idle',
          message: '本地存档已重置。',
          undoStack: [],
        });
        return true;
      } catch (error) {
        set({ operation: 'idle', message: `重置失败：${errorMessage(error)}` });
        return false;
      }
    },

    advanceBy: (deltaMs, reportProgress = true) => {
      if (get().operation !== 'idle') {
        return;
      }
      const game = get().gameState;
      if (game === null) {
        if (reportProgress) {
          set({ message: '请先创建或加载游戏。' });
        }
        return;
      }
      const next = advance(game, deltaMs, dependencies.rng);
      set({
        gameState: next,
        ...(reportProgress
          ? { message: `模拟已推进 ${Math.min(Math.max(deltaMs, 0), 250)}ms。` }
          : {}),
      });
      if (next.elapsedMs - lastAutomaticSaveElapsedMs >= 10_000) {
        lastAutomaticSaveElapsedMs = next.elapsedMs;
        persistGame(next, set);
      }
    },

    changeWorkPreference: (heroId, preference) => {
      const game = get().gameState;
      if (game === null) {
        return;
      }
      const next = setHeroWorkPreference(game, heroId, preference);
      set({
        gameState: next,
        message: '角色工作偏好已更新。',
      });
      persistGame(next, set);
    },

    startEquipmentAscension: (equipmentIds, materialMode, hammerStars) =>
      commitPersistentCommand(
        get,
        set,
        (game) =>
          startEquipmentAscensionCommand(
            game,
            equipmentIds,
            materialMode,
            hammerStars,
            dependencies.rng,
          ),
        (next) => {
          const candidates =
            next.progression.pendingEquipmentAscension?.candidateAffixIds.map(
              (id) => getAffixDefinition(id).name,
            ) ?? [];
          return `升阶素材已投入；本次词条候选：${candidates.join(' / ')}。`;
        },
      ),

    completeEquipmentAscension: (affixId) =>
      commitPersistentCommand(
        get,
        set,
        (game) => completeEquipmentAscensionCommand(game, affixId),
        `升阶完成，已选择「${getAffixDefinition(affixId).name}」。`,
      ),

    equipItem: (heroId, equipmentId) =>
      commitPersistentCommand(
        get,
        set,
        (game) => equipItemCommand(game, heroId, equipmentId),
        (next) => {
          const equipped = next.heroes.find((hero) => hero.id === heroId)?.equipment;
          const instance = Object.values(equipped ?? {}).find(
            (entry) => entry?.id === equipmentId,
          );
          return instance === undefined
            ? '装备已穿戴。'
            : `已穿戴「${getEquipmentDefinition(instance.definitionId).name}」。`;
        },
      ),

    unlockRuneNode: (heroId, nodeId, choiceId) =>
      commitPersistentCommand(
        get,
        set,
        (game) => unlockRuneNodeCommand(game, heroId, nodeId, choiceId),
        `已解锁符文节点 ${nodeId}。`,
      ),

    resetRunes: (heroId) =>
      commitPersistentCommand(
        get,
        set,
        (game) => resetRunesCommand(game, heroId),
        '符文树已重置，符文点已返还。',
      ),

    rerollCombatSkill: (heroId, skillId) =>
      commitPersistentCommand(
        get,
        set,
        (game) => rerollCombatSkillCommand(game, heroId, skillId, dependencies.rng),
        (next) => {
          const roll = next.heroes
            .find((hero) => hero.id === heroId)
            ?.combatSkillRollHistory.at(-1);
          return roll === undefined
            ? '技能重随完成。'
            : `顿悟结果：${getCombatSkillDefinition(skillId).name} → ${getCombatSkillDefinition(roll.resultSkillId).name}。`;
        },
      ),

    dispatchRegion: (regionId, heroIds) =>
      commitPersistentCommand(
        get,
        set,
        (game) => dispatchExpedition(game, regionId, heroIds),
        `远征队已出发：${getRegionDefinition(regionId).name}。`,
      ),

    startBossBattle: () =>
      commitPersistentCommand(get, set, markBossBattleStarted, 'Boss 战已开始。'),

    winBossBattle: () =>
      commitPersistentCommand(
        get,
        set,
        (game) => resolveBossVictory(game, dependencies.rng),
        'Boss 已击败，奖励与战斗等级已结算。',
      ),

    closeExpedition: () =>
      commitPersistentCommand(get, set, closeExpeditionResult, '远征结算已关闭。'),

    recruitHero: () => {
      const previousHeroIds = new Set(
        get().gameState?.heroes.map((hero) => hero.id) ?? [],
      );
      return commitPersistentCommand(
        get,
        set,
        (game) => recruitHeroCommand(game, dependencies.rng),
        (next) => {
          const recruited = next.heroes.find((hero) => !previousHeroIds.has(hero.id));
          return recruited === undefined
            ? '招募完成。'
            : `已招募${getProfessionArchetype(recruited.archetypeId).name}「${recruited.name}」，请分配帐篷。`;
        },
      );
    },

    assignHeroTent: (heroId, buildingId) =>
      commitPersistentCommand(
        get,
        set,
        (game) => assignHeroTentCommand(game, heroId, buildingId),
        '帐篷已分配，角色将开始自动工作循环。',
      ),

    buildBuilding: (definitionId, position) =>
      commitFortressCommand(
        get,
        set,
        (game) =>
          placeBuilding(game, {
            id: nextBuildingId(game, definitionId),
            definitionId,
            position,
          }),
        `已建造${definitionId === 'tent-basic' ? '帐篷' : '设施'}。`,
      ),

    moveBuilding: (buildingId, position) =>
      commitFortressCommand(
        get,
        set,
        (game) => moveBuilding(game, buildingId, position),
        '建筑已移动。',
      ),

    demolishBuilding: (buildingId) =>
      commitFortressCommand(
        get,
        set,
        (game) => demolishBuilding(game, buildingId),
        '建筑已拆除。',
      ),

    undoFortressCommand: () => {
      const previous = get().undoStack.at(-1);
      if (previous === undefined) {
        set({ message: '没有可撤销的建造操作。' });
        return;
      }

      set((state) => ({
        gameState: previous,
        undoStack: state.undoStack.slice(0, -1),
        message: '已撤销上一步建造操作。',
      }));
      persistGame(previous, set);
    },
  }));
}

const defaultDependencies: GameStoreDependencies = {
  repository: saveRepository satisfies IndexedDbSaveRepository,
  now: () => Date.now(),
  rng: () => Math.random(),
};

export const useGameStore = createGameStore(defaultDependencies);

export const selectGameState = (state: GameStoreState): Readonly<GameState> | null =>
  state.gameState;
export const selectOperation = (state: GameStoreState): StoreOperation => state.operation;
export const selectMessage = (state: GameStoreState): string => state.message;
