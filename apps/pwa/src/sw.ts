/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag !== 'fuelings-sync') return;
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        clients.forEach((client) =>
          client.postMessage({ type: 'RUN_FUELING_SYNC' }),
        );
      }),
  );
});
