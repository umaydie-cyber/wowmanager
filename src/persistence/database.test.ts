import 'fake-indexeddb/auto';

import { IndexedDbSaveRepository } from './database';

const uniqueDatabaseName = () => `wowmanager-test-${Math.random().toString(36).slice(2)}`;

describe('IndexedDbSaveRepository', () => {
  it('creates, saves, loads, and exports the single save', async () => {
    const repository = new IndexedDbSaveRepository(uniqueDatabaseName());
    const created = await repository.newGame(1_000);
    const updatedGame = { ...created.game, elapsedMs: 250 };

    await repository.save(updatedGame, 2_000);

    await expect(repository.load()).resolves.toMatchObject({
      schemaVersion: 2,
      savedAtEpochMs: 2_000,
      game: { elapsedMs: 250 },
    });
    await expect(repository.exportJson()).resolves.toContain('"savedAtEpochMs": 2000');
  });

  it('does not overwrite the current save when an import is invalid', async () => {
    const repository = new IndexedDbSaveRepository(uniqueDatabaseName());
    const original = await repository.newGame(3_000);

    await expect(
      repository.importJson(JSON.stringify({ schemaVersion: 999 })),
    ).rejects.toThrow();

    await expect(repository.load()).resolves.toEqual(original);
  });

  it('does not overwrite the current save when imported JSON is malformed', async () => {
    const repository = new IndexedDbSaveRepository(uniqueDatabaseName());
    const original = await repository.newGame(3_500);

    await expect(repository.importJson('{broken')).rejects.toThrow();

    await expect(repository.load()).resolves.toEqual(original);
  });

  it('clears the single local save', async () => {
    const repository = new IndexedDbSaveRepository(uniqueDatabaseName());
    await repository.newGame(3_750);

    await repository.clear();

    await expect(repository.load()).resolves.toBeNull();
  });

  it('imports a valid exported save', async () => {
    const source = new IndexedDbSaveRepository(uniqueDatabaseName());
    const target = new IndexedDbSaveRepository(uniqueDatabaseName());
    await source.newGame(4_000);

    const imported = await target.importJson(await source.exportJson());

    await expect(target.load()).resolves.toEqual(imported);
  });

  it('loads pre-fixed-step saves by defaulting the simulation remainder', async () => {
    const repository = new IndexedDbSaveRepository(uniqueDatabaseName());
    const created = await repository.newGame(5_000);
    const legacy = JSON.parse(JSON.stringify(created)) as {
      game: { simulationRemainderMs?: number };
    };
    delete legacy.game.simulationRemainderMs;

    const imported = await repository.importJson(JSON.stringify(legacy));

    expect(imported.game.simulationRemainderMs).toBe(0);
  });

  it('migrates a real v1-shaped save with every new growth field absent', async () => {
    const repository = new IndexedDbSaveRepository(uniqueDatabaseName());
    const created = await repository.newGame(6_000);
    const legacy = JSON.parse(JSON.stringify(created)) as {
      schemaVersion: number;
      game: {
        schemaVersion: number;
        equipmentInventory?: unknown;
        progression?: unknown;
        expedition: {
          regionProgress: {
            'ember-hollow': {
              completedWaveCount: number;
              bossDefeated: boolean;
              victoryCount?: number;
            };
            frostmarch?: unknown;
            'astral-rift'?: unknown;
          };
        };
        heroes: Array<{
          archetypeId?: string;
          combatLevel?: number;
          combatSkillIds?: string[];
          combatSkillRollHistory?: unknown[];
          equipment?: object;
          unlockedRuneNodeIds?: string[];
          runeChoiceSelections?: object;
          runePoints?: number;
        }>;
      };
    };
    legacy.schemaVersion = 1;
    legacy.game.schemaVersion = 1;
    delete legacy.game.equipmentInventory;
    delete legacy.game.progression;
    delete legacy.game.expedition.regionProgress.frostmarch;
    delete legacy.game.expedition.regionProgress['astral-rift'];
    delete legacy.game.expedition.regionProgress['ember-hollow'].victoryCount;
    for (const hero of legacy.game.heroes) {
      delete hero.archetypeId;
      delete hero.combatLevel;
      delete hero.combatSkillIds;
      delete hero.combatSkillRollHistory;
      delete hero.equipment;
      delete hero.unlockedRuneNodeIds;
      delete hero.runeChoiceSelections;
      delete hero.runePoints;
    }
    legacy.game.heroes[0]!.unlockedRuneNodeIds = ['stamina-1', 'stamina-5'];

    const imported = await repository.importJson(JSON.stringify(legacy));

    expect(imported.game.heroes[0]).toMatchObject({
      archetypeId: 'stonewarden',
      combatLevel: 1,
      combatSkillIds: [],
      combatSkillRollHistory: [],
      equipment: {},
      unlockedRuneNodeIds: ['stamina-1'],
      runeChoiceSelections: {},
      runePoints: 10,
    });
    expect(imported).toMatchObject({
      schemaVersion: 2,
      game: {
        schemaVersion: 2,
        equipmentInventory: [],
        progression: {
          insightPoints: 0,
          nextEquipmentInstanceNumber: 1,
          pendingEquipmentAscension: null,
        },
        expedition: {
          regionProgress: {
            'ember-hollow': { victoryCount: 0 },
            frostmarch: { completedWaveCount: 0, bossDefeated: false, victoryCount: 0 },
            'astral-rift': {
              completedWaveCount: 0,
              bossDefeated: false,
              victoryCount: 0,
            },
          },
        },
      },
    });
  });
});
