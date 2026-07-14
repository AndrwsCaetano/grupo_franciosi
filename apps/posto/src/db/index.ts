import * as SQLite from 'expo-sqlite';

const DB_NAME = 'posto.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync('PRAGMA journal_mode = WAL;');
      await createSchema(db);
      return db;
    })();
  }
  return dbPromise;
}

/** Espelha os campos reais de FuelPoint/FuelProduct/FuelStock/Machinery/FuelTransfer (apps/api). */
async function createSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS points (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      max_capacity_liters REAL NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      validated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      unit TEXT NOT NULL DEFAULT 'L',
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS stocks (
      id TEXT PRIMARY KEY,
      point_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity_liters REAL NOT NULL DEFAULT 0,
      min_reserve_liters REAL NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_stocks_point ON stocks(point_id);

    CREATE TABLE IF NOT EXISTS machinery (
      id TEXT PRIMARY KEY,
      tag TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT,
      default_product_id TEXT,
      hour_meter REAL,
      odometer_km REAL,
      status TEXT NOT NULL DEFAULT 'ATIVO',
      erp_external_id TEXT,
      validated_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_machinery_tag ON machinery(tag);
    CREATE INDEX IF NOT EXISTS idx_machinery_erp ON machinery(erp_external_id);

    CREATE TABLE IF NOT EXISTS transfers (
      id TEXT PRIMARY KEY,
      origin_point_id TEXT NOT NULL,
      dest_point_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      liters REAL NOT NULL,
      status TEXT NOT NULL,
      observation TEXT,
      created_at TEXT,
      accepted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_transfers_dest ON transfers(dest_point_id);
    CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);

    CREATE TABLE IF NOT EXISTS dispensings_local (
      offline_client_id TEXT PRIMARY KEY,
      machinery_id TEXT NOT NULL,
      point_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      liters REAL NOT NULL,
      hour_meter_reported REAL,
      km_reported REAL,
      notes TEXT,
      created_at_local TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_disp_point ON dispensings_local(point_id);
    CREATE INDEX IF NOT EXISTS idx_disp_machinery ON dispensings_local(machinery_id);

    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      offline_client_id TEXT NOT NULL UNIQUE,
      kind TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      last_attempt_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_queue_status ON sync_queue(status);

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

export async function resetLocalCache(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM points;
    DELETE FROM products;
    DELETE FROM stocks;
    DELETE FROM machinery;
    DELETE FROM transfers;
  `);
}

/**
 * Apaga TODOS os dados locais (cache, fila de sync, apontamentos locais e meta).
 * Usado ao trocar de servidor: dados de um servidor não podem vazar para outro.
 */
export async function wipeAllLocalData(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM points;
    DELETE FROM products;
    DELETE FROM stocks;
    DELETE FROM machinery;
    DELETE FROM transfers;
    DELETE FROM dispensings_local;
    DELETE FROM sync_queue;
    DELETE FROM meta;
  `);
}

export async function getMeta(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string | null }>(
    'SELECT value FROM meta WHERE key = ?',
    key,
  );
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value,
  );
}
