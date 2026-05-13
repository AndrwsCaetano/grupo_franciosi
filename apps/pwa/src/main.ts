import Alpine from 'alpinejs';
import { registerSW } from 'virtual:pwa-register';
import { registerAlpineComponents } from './app';
import { initPwaInstallListeners } from './pwa-install';
import { syncPendingFuelings } from './sync';
import './style.css';

initPwaInstallListeners();

registerAlpineComponents(Alpine);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'RUN_FUELING_SYNC') {
      void syncPendingFuelings();
    }
  });
}

Alpine.start();

registerSW({ immediate: true });

window.addEventListener('online', () => {
  void syncPendingFuelings();
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    void syncPendingFuelings();
  }
});
