import { getDb } from './index';
import type {
  BootstrapPayload,
  FuelPoint,
  Machinery,
  MachineryStatus,
  Product,
  Stock,
  Transfer,
  TransferStatus,
} from '../api/fuelStation';

/* --------------------------- Bootstrap ingestion --------------------------- */

export async function replaceBootstrap(payload: BootstrapPayload): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM points;
      DELETE FROM products;
      DELETE FROM stocks;
      DELETE FROM machinery;
      DELETE FROM transfers;
    `);

    for (const p of payload.points ?? []) {
      await db.runAsync(
        'INSERT INTO points (id, name, type, max_capacity_liters, active, validated_at) VALUES (?, ?, ?, ?, ?, ?)',
        p.id,
        p.name,
        p.type,
        p.maxCapacityLiters ?? 0,
        p.active ? 1 : 0,
        p.validatedAt ?? null,
      );
    }
    for (const p of payload.products ?? []) {
      await db.runAsync(
        'INSERT INTO products (id, name, unit, active) VALUES (?, ?, ?, ?)',
        p.id,
        p.name,
        p.unit ?? 'L',
        p.active ? 1 : 0,
      );
    }
    for (const s of payload.stocks ?? []) {
      await db.runAsync(
        `INSERT INTO stocks (id, point_id, product_id, quantity_liters, min_reserve_liters)
          VALUES (?, ?, ?, ?, ?)`,
        s.id,
        s.pointId,
        s.productId,
        s.quantityLiters ?? 0,
        s.minReserveLiters ?? 0,
      );
    }
    for (const m of payload.machinery ?? []) {
      await db.runAsync(
        `INSERT INTO machinery
          (id, tag, name, category, default_product_id, hour_meter, odometer_km, status, erp_external_id, validated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        m.id,
        m.tag,
        m.name,
        m.category ?? null,
        m.defaultProductId ?? null,
        m.hourMeter ?? 0,
        m.odometerKm ?? 0,
        m.status ?? 'ATIVO',
        m.erpExternalId ?? null,
        m.validatedAt ?? null,
      );
    }
    for (const t of payload.pendingTransfers ?? []) {
      await db.runAsync(
        `INSERT INTO transfers
          (id, origin_point_id, dest_point_id, product_id, liters, status, observation, created_at, accepted_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        t.id,
        t.originPointId,
        t.destPointId,
        t.productId,
        t.liters,
        t.status,
        t.observation ?? null,
        t.createdAt ?? null,
        t.acceptedAt ?? null,
      );
    }
  });
}

/* --------------------------------- Points --------------------------------- */

function mapPoint(r: any): FuelPoint {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    maxCapacityLiters: r.max_capacity_liters,
    active: !!r.active,
    validatedAt: r.validated_at,
  };
}

export async function listPoints(): Promise<FuelPoint[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM points ORDER BY name ASC');
  return rows.map(mapPoint);
}

export async function getPoint(id: string): Promise<FuelPoint | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>('SELECT * FROM points WHERE id = ?', id);
  return row ? mapPoint(row) : null;
}

/* -------------------------------- Products -------------------------------- */

export async function listProducts(): Promise<Product[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    unit: string;
    active: number;
  }>('SELECT id, name, unit, active FROM products ORDER BY name ASC');
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    unit: r.unit ?? 'L',
    active: !!r.active,
  }));
}

/* --------------------------------- Stocks --------------------------------- */

/**
 * A API não expõe capacidade/reserva por produto (apenas `minReserveLiters`,
 * que é um limiar de alerta, não um volume reservado). Para a barra de
 * progresso usamos `maxCapacityLiters` do ponto como referência aproximada
 * do tanque compartilhado.
 */
export interface StockRow extends Stock {
  productName?: string;
  productUnit?: string;
  pointCapacityLiters?: number;
}

export async function listStocksForPoint(pointId: string): Promise<StockRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    point_id: string;
    product_id: string;
    quantity_liters: number;
    min_reserve_liters: number;
    product_name: string | null;
    product_unit: string | null;
    max_capacity_liters: number | null;
  }>(
    `SELECT s.id, s.point_id, s.product_id, s.quantity_liters, s.min_reserve_liters,
            p.name AS product_name, p.unit AS product_unit, pt.max_capacity_liters
     FROM stocks s
     LEFT JOIN products p ON p.id = s.product_id
     LEFT JOIN points pt ON pt.id = s.point_id
     WHERE s.point_id = ?
     ORDER BY p.name ASC`,
    pointId,
  );
  return rows.map((r) => ({
    id: r.id,
    pointId: r.point_id,
    productId: r.product_id,
    quantityLiters: r.quantity_liters,
    minReserveLiters: r.min_reserve_liters,
    productName: r.product_name ?? undefined,
    productUnit: r.product_unit ?? undefined,
    pointCapacityLiters: r.max_capacity_liters ?? undefined,
  }));
}

export async function decrementStock(
  pointId: string,
  productId: string,
  liters: number,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE stocks SET quantity_liters = MAX(0, quantity_liters - ?)
     WHERE point_id = ? AND product_id = ?`,
    liters,
    pointId,
    productId,
  );
}

export async function incrementStock(
  pointId: string,
  productId: string,
  liters: number,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE stocks SET quantity_liters = quantity_liters + ?
     WHERE point_id = ? AND product_id = ?`,
    liters,
    pointId,
    productId,
  );
}

/* -------------------------------- Machinery ------------------------------- */

function mapMachinery(r: any): Machinery {
  return {
    id: r.id,
    tag: r.tag,
    name: r.name,
    category: r.category,
    defaultProductId: r.default_product_id,
    hourMeter: r.hour_meter,
    odometerKm: r.odometer_km,
    status: (r.status ?? 'ATIVO') as MachineryStatus,
    erpExternalId: r.erp_external_id,
    validatedAt: r.validated_at,
  };
}

export async function listMachinery(): Promise<Machinery[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM machinery ORDER BY name ASC');
  return rows.map(mapMachinery);
}

/** Busca por tag (impressa no QR) ou pelo id externo vindo do ERP. */
export async function findMachineryByQr(code: string): Promise<Machinery | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM machinery WHERE tag = ? OR erp_external_id = ? LIMIT 1',
    code,
    code,
  );
  return row ? mapMachinery(row) : null;
}

export async function getMachinery(id: string): Promise<Machinery | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>('SELECT * FROM machinery WHERE id = ?', id);
  return row ? mapMachinery(row) : null;
}

export async function updateMachineryMeters(
  id: string,
  meters: { hourMeter?: number | null; odometerKm?: number | null },
): Promise<void> {
  const db = await getDb();
  if (meters.hourMeter != null) {
    await db.runAsync('UPDATE machinery SET hour_meter = ? WHERE id = ?', meters.hourMeter, id);
  }
  if (meters.odometerKm != null) {
    await db.runAsync('UPDATE machinery SET odometer_km = ? WHERE id = ?', meters.odometerKm, id);
  }
}

/* -------------------------------- Transfers ------------------------------- */

function mapTransfer(r: any): Transfer {
  return {
    id: r.id,
    originPointId: r.origin_point_id,
    destPointId: r.dest_point_id,
    productId: r.product_id,
    liters: r.liters,
    status: r.status,
    observation: r.observation,
    createdAt: r.created_at,
    acceptedAt: r.accepted_at,
  };
}

export async function listTransfers(): Promise<Transfer[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(`SELECT * FROM transfers ORDER BY created_at DESC`);
  return rows.map(mapTransfer);
}

export async function listPendingTransfersForPoint(pointId: string): Promise<Transfer[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM transfers
     WHERE dest_point_id = ? AND status = 'PENDENTE'
     ORDER BY created_at DESC`,
    pointId,
  );
  return rows.map(mapTransfer);
}

export async function getTransfer(id: string): Promise<Transfer | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>('SELECT * FROM transfers WHERE id = ?', id);
  return row ? mapTransfer(row) : null;
}

export async function upsertTransfer(t: Transfer): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO transfers
      (id, origin_point_id, dest_point_id, product_id, liters, status, observation, created_at, accepted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        origin_point_id = excluded.origin_point_id,
        dest_point_id = excluded.dest_point_id,
        product_id = excluded.product_id,
        liters = excluded.liters,
        status = excluded.status,
        observation = excluded.observation,
        created_at = excluded.created_at,
        accepted_at = excluded.accepted_at`,
    t.id,
    t.originPointId,
    t.destPointId,
    t.productId,
    t.liters,
    t.status,
    t.observation ?? null,
    t.createdAt ?? null,
    t.acceptedAt ?? null,
  );
}

export async function setTransferStatus(id: string, status: TransferStatus): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE transfers SET status = ? WHERE id = ?', status, id);
}

/* ---------------------------- Local dispensings --------------------------- */

/**
 * Guardado localmente para exibir histórico na aba Estoque. `notes` é
 * puramente local — a API (`CreateDispensingDto`) não tem esse campo.
 */
export interface LocalDispensing {
  offlineClientId: string;
  machineryId: string;
  pointId: string;
  productId: string;
  liters: number;
  hourMeterReported?: number | null;
  kmReported?: number | null;
  notes?: string | null;
  createdAtLocal: string;
}

export async function insertLocalDispensing(d: LocalDispensing): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO dispensings_local
      (offline_client_id, machinery_id, point_id, product_id, liters,
       hour_meter_reported, km_reported, notes, created_at_local)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    d.offlineClientId,
    d.machineryId,
    d.pointId,
    d.productId,
    d.liters,
    d.hourMeterReported ?? null,
    d.kmReported ?? null,
    d.notes ?? null,
    d.createdAtLocal,
  );
}

export async function listLocalDispensingsForPoint(
  pointId: string,
  limit = 20,
): Promise<LocalDispensing[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM dispensings_local WHERE point_id = ?
     ORDER BY created_at_local DESC LIMIT ?`,
    pointId,
    limit,
  );
  return rows.map((r) => ({
    offlineClientId: r.offline_client_id,
    machineryId: r.machinery_id,
    pointId: r.point_id,
    productId: r.product_id,
    liters: r.liters,
    hourMeterReported: r.hour_meter_reported,
    kmReported: r.km_reported,
    notes: r.notes,
    createdAtLocal: r.created_at_local,
  }));
}
