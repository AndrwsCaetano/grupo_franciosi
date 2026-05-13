/** Evento não incluído em todas as lib DOM; mínimo necessário para `prompt()`. */
export type PwaBeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferred: PwaBeforeInstallPromptEvent | null = null;

export function initPwaInstallListeners(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as PwaBeforeInstallPromptEvent;
    window.dispatchEvent(new CustomEvent('gf-pwa-install-ready'));
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    window.dispatchEvent(new CustomEvent('gf-pwa-installed'));
  });
}

export function hasDeferredInstallPrompt(): boolean {
  return deferred !== null;
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

/** Safari no iOS/iPadOS (sem Chrome/Firefox iOS). */
export function isLikelyIosSafari(): boolean {
  const ua = navigator.userAgent || '';
  const iPad =
    /iPad/.test(ua) ||
    (navigator.platform === 'MacIntel' &&
      (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints! >
        1);
  const iOS = /iPhone|iPod/.test(ua) || iPad;
  if (!iOS) return false;
  if (/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua)) return false;
  return /Safari/.test(ua) && !/CriOS/.test(ua);
}

/**
 * Abre o diálogo nativo de instalação (Chromium/Android/desktop).
 * @returns true se o utilizador aceitou.
 */
export async function promptPwaInstall(): Promise<boolean> {
  if (!deferred) return false;
  const ev = deferred;
  deferred = null;
  try {
    await ev.prompt();
    const { outcome } = await ev.userChoice;
    return outcome === 'accepted';
  } catch {
    return false;
  }
}
