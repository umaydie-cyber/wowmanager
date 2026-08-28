import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { z } from 'zod';

import { createNewGame } from '@/game/core/actions/newGame';
import { GAME_SCHEMA_VERSION, type GameState, type SaveFile } from '@/game/core/types';
import { parseSaveFile, saveFileSchema } from '@/persistence/schema';

export const SAVE_DATABASE_NAME = 'wowmanager';
const DATABASE_VERSION = 3;
const SAVE_STORE = 'saves';
const SINGLE_SAVE_ID = 'single-save';

interface StoredSaveFile {
  id: typeof SINGLE_SAVE_ID;
  file: SaveFile;
}

const storedSaveFileSchema = z.object({
  id: z.literal(SINGLE_SAVE_ID),
  file: z.unknown(),
});

interface WowManagerDatabase extends DBSchema {
  saves: {
    key: string;
    value: StoredSaveFile;
  };
}

export class NoSaveFileError extends Error {
  constructor() {
    super('当前没有可导出的本地存档。');
    this.name = 'NoSaveFileError';
  }
}

export class IndexedDbSaveRepository {
  constructor(private readonly databaseName = SAVE_DATABASE_NAME) {}

  private open(): Promise<IDBPDatabase<WowManagerDatabase>> {
    return openDB<WowManagerDatabase>(this.databaseName, DATABASE_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(SAVE_STORE)) {
          database.createObjectStore(SAVE_STORE, { keyPath: 'id' });
        }
      },
    });
  }

  async newGame(savedAtEpochMs: number): Promise<SaveFile> {
    return this.save(createNewGame(), savedAtEpochMs);
  }

  async save(game: GameState, savedAtEpochMs: number): Promise<SaveFile> {
    const file = saveFileSchema.parse({
      schemaVersion: GAME_SCHEMA_VERSION,
      savedAtEpochMs,
      game,
    });
    await this.writeValidated(file);
    return file;
  }

  async load(): Promise<SaveFile | null> {
    const database = await this.open();
    try {
      const stored = await database.get(SAVE_STORE, SINGLE_SAVE_ID);
      if (stored === undefined) {
        return null;
      }
      return parseSaveFile(storedSaveFileSchema.parse(stored).file);
    } finally {
      database.close();
    }
  }

  async exportJson(): Promise<string> {
    const file = await this.load();
    if (file === null) {
      throw new NoSaveFileError();
    }
    return JSON.stringify(file, null, 2);
  }

  async importJson(json: string): Promise<SaveFile> {
    const parsed: unknown = JSON.parse(json);
    const file = parseSaveFile(parsed);
    // Validation completes before IndexedDB is opened, so a bad import is atomic.
    await this.writeValidated(file);
    return file;
  }

  async clear(): Promise<void> {
    const database = await this.open();
    try {
      await database.delete(SAVE_STORE, SINGLE_SAVE_ID);
    } finally {
      database.close();
    }
  }

  private async writeValidated(file: SaveFile): Promise<void> {
    const database = await this.open();
    try {
      await database.put(SAVE_STORE, { id: SINGLE_SAVE_ID, file });
    } finally {
      database.close();
    }
  }
}

export const saveRepository = new IndexedDbSaveRepository();
