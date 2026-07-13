import { apiJson } from './client';

/**
 * Tipos alinhados ao Prisma schema / DTOs reais de
 * `apps/api/src/fuel-station/*`. Não inventar campos que a API não
 * whitelista — `ValidationPipe` está com `forbidNonWhitelisted: true`, então
 * qualquer propriedade extra no corpo de um POST/PATCH derruba a request.
 */

export type FuelPointType = 'POSTO' | 'COMBOIO';

export interface FuelPoint {
  id: string;
  name: string;
  type: FuelPointType;
  maxCapacityLiters: number;
  active: boolean;
  validatedAt?: string | null;
}

export interface Product {
  id: string;
  name: string;
  unit: string;
  active: boolean;
}

/** FuelStock — não existe "capacity"/"reserved" por produto na API real. */
export interface Stock {
  id: string;
  pointId: string;
  productId: string;
  quantityLiters: number;
  minReserveLiters: number;
  product?: { id: string; name: string; unit: string };
}

export type MachineryStatus = 'ATIVO' | 'MANUTENCAO' | 'INATIVO';

export interface Machinery {
  id: string;
  tag: string;
  name: string;
  category: string;
  defaultProductId?: string | null;
  hourMeter: number;
  odometerKm: number;
  status: MachineryStatus;
  erpExternalId?: string | null;
  validatedAt?: string | null;
  defaultProduct?: { id: string; name: string; unit: string } | null;
}

export type TransferStatus = 'PENDENTE' | 'ACEITA' | 'RECUSADA';

export interface Transfer {
  id: string;
  originPointId: string;
  destPointId: string;
  productId: string;
  liters: number;
  status: TransferStatus;
  observation?: string | null;
  createdByUserId?: string;
  acceptedByUserId?: string | null;
  acceptedAt?: string | null;
  createdAt?: string;
  originPoint?: { id: string; name: string; type: FuelPointType };
  destPoint?: { id: string; name: string; type: FuelPointType };
  product?: { id: string; name: string; unit: string };
}

/** Espelha o retorno de `BootstrapService.build()` (apps/api). */
export interface BootstrapPayload {
  user: { id: string };
  points: FuelPoint[];
  products: Product[];
  stocks: Stock[];
  machinery: Machinery[];
  pendingTransfers: Transfer[];
}

export function fetchBootstrap(): Promise<BootstrapPayload> {
  return apiJson<BootstrapPayload>('/fuel-station/bootstrap');
}

/** Corpo exato de `CreateDispensingDto`. */
export interface DispensingPayload {
  machineryId: string;
  pointId: string;
  productId: string;
  liters: number;
  hourMeterReported?: number;
  kmReported?: number;
  offlineClientId?: string;
}

export type FuelSyncStatus = 'PENDENTE' | 'SINCRONIZADO' | 'ERRO';

export interface DispensingResponse {
  id: string;
  machineryId: string;
  pointId: string;
  productId: string;
  liters: number;
  hourMeterReported?: number | null;
  kmReported?: number | null;
  offlineClientId?: string | null;
  syncStatus: FuelSyncStatus;
  createdAt: string;
}

export function createDispensing(
  payload: DispensingPayload,
): Promise<DispensingResponse> {
  return apiJson<DispensingResponse>('/fuel-station/dispensings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Corpo exato de `CreateTransferDto` — sem `offlineClientId` (a API não tem esse campo aqui). */
export interface TransferRequestPayload {
  originPointId: string;
  destPointId: string;
  productId: string;
  liters: number;
  observation?: string;
}

export function createTransferRequest(
  payload: TransferRequestPayload,
): Promise<Transfer> {
  return apiJson<Transfer>('/fuel-station/transfers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * `POST .../accept` não recebe corpo — o destino credita sempre o valor
 * total de `liters` da transferência (ver `TransfersService.accept`).
 */
export function acceptTransfer(transferId: string): Promise<Transfer> {
  return apiJson<Transfer>(
    `/fuel-station/transfers/${encodeURIComponent(transferId)}/accept`,
    { method: 'POST' },
  );
}

/** Corpo exato de `RejectTransferDto`. */
export function rejectTransfer(
  transferId: string,
  reason?: string,
): Promise<Transfer> {
  return apiJson<Transfer>(
    `/fuel-station/transfers/${encodeURIComponent(transferId)}/reject`,
    { method: 'POST', body: JSON.stringify({ reason }) },
  );
}
