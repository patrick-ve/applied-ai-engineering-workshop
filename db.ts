import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite/vector';

let dbInstance;

export const initDb = async () => {
  if (dbInstance) {
    return dbInstance;
  }
  const db = new PGlite('file://recipes.db', {
    extensions: {
      vector,
    },
  });

  await db.waitReady;

  dbInstance = db;
  return db as PGlite;
};

export const initSchema = async (db) => {
  await db.exec(`
    CREATE EXTENSION IF NOT EXISTS vector;

    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      servings INTEGER NOT NULL,
      equipment TEXT,     -- Stored as JSON string
      ingredients TEXT,   -- Stored as JSON string
      steps TEXT,         -- Stored as JSON string
      totalTime INTEGER NOT NULL,
      embedding vector(384)
    );

    CREATE INDEX IF NOT EXISTS recipes_embedding_idx ON recipes USING ivfflat (embedding);
  `);
};
