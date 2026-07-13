import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import {
  acceptTransfer,
  createDispensing,
  createTransferRequest,
  rejectTransfer,
  type DispensingPayload,
  type TransferRequestPayload,
} from '../api/fuelStation';
import * as queue from '../db/queue';
import { setMeta } from '../db';
import { setTransferStatus } from '../db/repos';

type Listener = () => void;

const listeners = new Set<Listener>();
let isProcessing = false;
let online = true;

function notify() {
  for (const l of listeners) l();
}

export function onSyncChange(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function isOnline(): boolean {
  return online;
}

export function startNetworkWatcher(): () => void {
  const unsub = NetInfo.addEventListener((s: NetInfoState) => {
    const nextOnline = Boolean(s.isConnected) && s.isInternetReachable !== false;
    if (nextOnline !== online) {
      online = nextOnline;
      notify();
      if (online) {
        // fire and forget
        void processQueue();
      }
    }
  });
  return unsub;
}

interface TransferActionPayload {
  transferId: string;
  reason?: string;
}

async function runOne(item: queue.QueueItem): Promise<void> {
  switch (item.kind) {
    case 'dispensing': {
      const payload = item.payload as DispensingPayload;
      await createDispensing(payload);
      break;
    }
    case 'transfer_request': {
      const payload = item.payload as TransferRequestPayload;
      await createTransferRequest(payload);
      break;
    }
    case 'transfer_accept': {
      const payload = item.payload as TransferActionPayload;
      await acceptTransfer(payload.transferId);
      await setTransferStatus(payload.transferId, 'ACEITA');
      break;
    }
    case 'transfer_reject': {
      const payload = item.payload as TransferActionPayload;
      await rejectTransfer(payload.transferId, payload.reason);
      await setTransferStatus(payload.transferId, 'RECUSADA');
      break;
    }
    default:
      throw new Error(`unsupported queue kind: ${item.kind}`);
  }
}

export async function processQueue(): Promise<void> {
  if (isProcessing) return;
  if (!online) return;
  isProcessing = true;
  notify();
  try {
    while (online) {
      const next = await queue.nextPending();
      if (!next) break;
      await queue.markSyncing(next.id);
      notify();
      try {
        await runOne(next);
        await queue.markDone(next.id);
        await setMeta('lastSyncAt', new Date().toISOString());
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await queue.markError(next.id, msg);
        notify();
        // Stop processing on error to avoid hammering a broken endpoint.
        break;
      }
      notify();
    }
  } finally {
    isProcessing = false;
    notify();
  }
}

export async function forceSync(): Promise<void> {
  await queue.resetErrorsToPending();
  notify();
  await processQueue();
}

export function getIsProcessing(): boolean {
  return isProcessing;
}
