import { getDb } from './index';

export type QueueKind = 'dispensing' | 'transfer_request' | 'transfer_accept' | 'transfer_reject';
export type QueueStatus = 'pending' | 'syncing' | 'error' | 'done';

export interface QueueItem {
  id: number;
  offlineClientId: string;
  kind: QueueKind;
  payload: unknown;
  status: QueueStatus;
  attempts: number;
  lastError: string | null;
  lastAttemptAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RawRow {
  id: number;
  offline_client_id: string;
  kind: QueueKind;
  payload: string;
  status: QueueStatus;
  attempts: number;
  last_error: string | null;
  last_attempt_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(r: RawRow): QueueItem {
  let payload: unknown = null;
  try {
    payload = JSON.parse(r.payload);
  } catch {
    payload = r.payload;
  }
  return {
    id: r.id,
    offlineClientId: r.offline_client_id,
    kind: r.kind,
    payload,
    status: r.status,
    attempts: r.attempts,
    lastError: r.last_error,
    lastAttemptAt: r.last_attempt_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function enqueue(item: {
  offlineClientId: string;
  kind: QueueKind;
  payload: unknown;
}): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO sync_queue
      (offline_client_id, kind, payload, status, attempts, created_at, updated_at)
      VALUES (?, ?, ?, 'pending', 0, ?, ?)`,
    item.offlineClientId,
    item.kind,
    JSON.stringify(item.payload),
    now,
    now,
  );
}

export async function listQueue(status?: QueueStatus): Promise<QueueItem[]> {
  const db = await getDb();
  const rows = status
    ? await db.getAllAsync<RawRow>(
        'SELECT * FROM sync_queue WHERE status = ? ORDER BY id ASC',
        status,
      )
    : await db.getAllAsync<RawRow>('SELECT * FROM sync_queue ORDER BY id ASC');
  return rows.map(mapRow);
}

export async function countByStatus(): Promise<Record<QueueStatus, number>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ status: QueueStatus; c: number }>(
    'SELECT status, COUNT(*) as c FROM sync_queue GROUP BY status',
  );
  const out: Record<QueueStatus, number> = {
    pending: 0,
    syncing: 0,
    error: 0,
    done: 0,
  };
  for (const r of rows) out[r.status] = r.c;
  return out;
}

export async function nextPending(): Promise<QueueItem | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<RawRow>(
    "SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY id ASC LIMIT 1",
  );
  return row ? mapRow(row) : null;
}

export async function markSyncing(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE sync_queue SET status = 'syncing', updated_at = ? WHERE id = ?",
    new Date().toISOString(),
    id,
  );
}

export async function markDone(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE sync_queue SET status = 'done', updated_at = ?, last_error = NULL WHERE id = ?",
    new Date().toISOString(),
    id,
  );
}

export async function markError(id: number, err: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE sync_queue SET status = 'error', attempts = attempts + 1,
      last_error = ?, last_attempt_at = ?, updated_at = ? WHERE id = ?`,
    err,
    now,
    now,
    id,
  );
}

export async function resetErrorsToPending(): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE sync_queue SET status = 'pending', updated_at = ? WHERE status = 'error'",
    new Date().toISOString(),
  );
}

export async function removeById(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM sync_queue WHERE id = ?', id);
}

export async function purgeDone(): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM sync_queue WHERE status = 'done'");
}
