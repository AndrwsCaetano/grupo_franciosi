import { apiFetch, getAccessToken } from './api';
import { allPending, removePending } from './db';

function notifySynced(): void {
  window.dispatchEvent(new CustomEvent('gf-pending-synced'));
}

export async function syncPendingFuelings(): Promise<{
  ok: number;
  fail: number;
}> {
  if (!navigator.onLine || !getAccessToken()) {
    return { ok: 0, fail: 0 };
  }
  const rows = await allPending();
  let ok = 0;
  let fail = 0;
  for (const row of rows) {
    const fd = new FormData();
    fd.append('quantityLiters', String(row.quantityLiters));
    fd.append('odometerKm', String(row.odometerKm));
    fd.append(
      'fuelDate',
      row.fuelDateIso ?? row.lancadoEm.slice(0, 10),
    );
    fd.append('lancadoEm', row.lancadoEm);
    fd.append('offlineClientId', row.offlineClientId);
    const blob = new Blob([row.receiptData], { type: row.receiptType });
    fd.append('receipt', blob, row.receiptName);
    const res = await apiFetch('/driver/fuelings', { method: 'POST', body: fd });
    if (res.ok) {
      await removePending(row.offlineClientId);
      ok += 1;
    } else {
      fail += 1;
    }
  }
  if (ok > 0) notifySynced();
  return { ok, fail };
}

export async function registerFuelingsBackgroundSync(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  if ('sync' in reg && reg.sync) {
    try {
      await reg.sync.register('fuelings-sync');
    } catch {
      /* navegador pode não suportar ou fora de HTTPS */
    }
  }
}
