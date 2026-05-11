import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export type PendingFuelingRow = {
  offlineClientId: string;
  /** Data do abastecimento (YYYY-MM-DD). Ausente em registos antigos da fila. */
  fuelDateIso?: string;
  quantityLiters: number;
  odometerKm: number;
  lancadoEm: string;
  receiptName: string;
  receiptType: string;
  receiptData: ArrayBuffer;
  savedAt: number;
};

interface GfDriverSchema extends DBSchema {
  pending: {
    key: string;
    value: PendingFuelingRow;
  };
}

let dbPromise: Promise<IDBPDatabase<GfDriverSchema>> | null = null;

function getDb(): Promise<IDBPDatabase<GfDriverSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<GfDriverSchema>('gf-driver-pwa', 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('pending')) {
          db.createObjectStore('pending', { keyPath: 'offlineClientId' });
        }
      },
    });
  }
  return dbPromise;
}

export async function addPending(row: PendingFuelingRow): Promise<void> {
  const db = await getDb();
  await db.put('pending', row);
}

export async function allPending(): Promise<PendingFuelingRow[]> {
  const db = await getDb();
  return db.getAll('pending');
}

export async function removePending(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('pending', id);
}
