import { createNewGame } from '@/game/core/actions/newGame';
import type { GameState, SaveFile } from '@/game/core/types';

import { createGameStore } from './useGameStore';

const flushPersistenceQueue = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

describe('game store simulation persistence', () => {
  it('auto-saves once per ten seconds and persists an important tent-preference change', async () => {
    const saveCalls: GameState[] = [];
    const repository = {
      newGame: async (savedAtEpochMs: number): Promise<SaveFile> => ({
        schemaVersion: 2,
        savedAtEpochMs,
        game: createNewGame(),
      }),
      save: async (game: GameState, savedAtEpochMs: number): Promise<SaveFile> => {
        saveCalls.push(game);
        return { schemaVersion: 2, savedAtEpochMs, game };
      },
      load: async (): Promise<SaveFile | null> => null,
      exportJson: async (): Promise<string> => '{}',
      importJson: async (): Promise<SaveFile> => ({
        schemaVersion: 2,
        savedAtEpochMs: 0,
        game: createNewGame(),
      }),
      clear: async (): Promise<void> => undefined,
    };
    const store = createGameStore({
      repository,
      now: () => 1_000,
      rng: () => 0,
    });

    await store.getState().createNewGame();
    for (let elapsedMs = 0; elapsedMs < 10_000; elapsedMs += 250) {
      store.getState().advanceBy(250, false);
    }
    await flushPersistenceQueue();

    expect(saveCalls).toHaveLength(1);
    expect(saveCalls[0]?.elapsedMs).toBe(10_000);

    store.getState().changeWorkPreference('hero-aelan', 'training');
    await flushPersistenceQueue();

    expect(saveCalls).toHaveLength(2);
    expect(
      saveCalls[1]?.fortress.buildings.find((building) => building.id === 'tent-aelan')
        ?.workPreference,
    ).toBe('training');
  });

  it('immediately persists recruitment and tent assignment', async () => {
    const saveCalls: GameState[] = [];
    const repository = {
      newGame: async (savedAtEpochMs: number): Promise<SaveFile> => ({
        schemaVersion: 2,
        savedAtEpochMs,
        game: createNewGame(),
      }),
      save: async (game: GameState, savedAtEpochMs: number): Promise<SaveFile> => {
        saveCalls.push(game);
        return { schemaVersion: 2, savedAtEpochMs, game };
      },
      load: async (): Promise<SaveFile | null> => null,
      exportJson: async (): Promise<string> => '{}',
      importJson: async (): Promise<SaveFile> => ({
        schemaVersion: 2,
        savedAtEpochMs: 0,
        game: createNewGame(),
      }),
      clear: async (): Promise<void> => undefined,
    };
    const store = createGameStore({
      repository,
      now: () => 2_000,
      rng: () => 0,
    });
    await store.getState().createNewGame();
    const game = store.getState().gameState!;
    store.setState({
      gameState: {
        ...game,
        fortress: {
          ...game.fortress,
          buildings: [
            ...game.fortress.buildings,
            {
              id: 'tent-recruit-01',
              definitionId: 'tent-basic',
              position: { x: 7, y: 0 },
              ownerHeroId: null,
            },
          ],
        },
      },
    });

    expect(store.getState().recruitHero()).toBe(true);
    await flushPersistenceQueue();
    const recruited = store.getState().gameState!.heroes.at(-1)!;
    expect(recruited.activity.type).toBe('UNPLACED');
    expect(saveCalls).toHaveLength(1);

    expect(store.getState().assignHeroTent(recruited.id, 'tent-recruit-01')).toBe(true);
    await flushPersistenceQueue();

    expect(saveCalls).toHaveLength(2);
    expect(saveCalls.at(-1)?.heroes.at(-1)).toMatchObject({
      homeBuildingId: 'tent-recruit-01',
      activity: { type: 'TO_REST' },
    });
  });

  it('serializes reset after queued automatic saves so stale progress cannot return', async () => {
    const events: string[] = [];
    let releaseSave: (() => void) | undefined;
    const repository = {
      newGame: async (savedAtEpochMs: number): Promise<SaveFile> => ({
        schemaVersion: 2,
        savedAtEpochMs,
        game: createNewGame(),
      }),
      save: async (game: GameState, savedAtEpochMs: number): Promise<SaveFile> => {
        events.push('save-start');
        await new Promise<void>((resolve) => {
          releaseSave = resolve;
        });
        events.push('save-end');
        return { schemaVersion: 2, savedAtEpochMs, game };
      },
      load: async (): Promise<SaveFile | null> => null,
      exportJson: async (): Promise<string> => '{}',
      importJson: async (): Promise<SaveFile> => ({
        schemaVersion: 2,
        savedAtEpochMs: 0,
        game: createNewGame(),
      }),
      clear: async (): Promise<void> => {
        events.push('clear');
      },
    };
    const store = createGameStore({ repository, now: () => 3_000, rng: () => 0 });
    await store.getState().createNewGame();

    for (let elapsedMs = 0; elapsedMs < 10_000; elapsedMs += 250) {
      store.getState().advanceBy(250, false);
    }
    await Promise.resolve();
    const resetPromise = store.getState().resetSave();

    await vi.waitFor(() => expect(events).toEqual(['save-start']));
    releaseSave?.();
    await resetPromise;

    expect(events).toEqual(['save-start', 'save-end', 'clear']);
    expect(store.getState().gameState).toBeNull();
  });
});
