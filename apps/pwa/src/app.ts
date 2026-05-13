import type { Alpine as AlpineType } from 'alpinejs';
import {
  apiFetch,
  clearTokens,
  getAccessToken,
  getApiBase,
  setTokens,
} from './api';
import { addPending, allPending } from './db';
import {
  hasDeferredInstallPrompt,
  isLikelyIosSafari,
  isStandaloneDisplay,
  promptPwaInstall,
} from './pwa-install';
import { registerFuelingsBackgroundSync, syncPendingFuelings } from './sync';

type MeResponse = {
  driver: { id: string; name: string; cpf: string };
  /** Ausente quando ainda não há vínculo aberto com um veículo. */
  currentVehicle: {
    id: string;
    plate: string;
    brand: string;
    model: string;
  } | null;
};

type FuelingItem = {
  id: string;
  fuelDate: string;
  quantityLiters: unknown;
  odometerKm: number | null;
  receiptImagePath: string | null;
  createdAt: string;
  dataSincronizacao: string | null;
  offlineClientId: string | null;
  vehicle: { plate: string; brand: string; model: string };
};

type FuelListRow =
  | {
      kind: 'pending';
      key: string;
      liters: number;
      km: number;
      fuelDateIso: string;
      lancadoEm: string;
      savedAt: number;
    }
  | { kind: 'server'; key: string; item: FuelingItem };

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

/** Data/hora local para exibição na lista. */
function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function maskCpf(digits: string): string {
  const d = digits.replace(/\D/g, '');
  if (d.length !== 11) return digits;
  return `***.***.${d.slice(6, 9)}-${d.slice(9)}`;
}

function fmtLiters(v: unknown): string {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

function toLitersValue(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Ex.: 250,0 L (uma casa decimal, pt-BR). */
function fmtDashboardLiters(total: number): string {
  return (
    total.toLocaleString('pt-BR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }) + ' L'
  );
}

/** Data de hoje no calendário local, para exibição dd/mm/aaaa. */
function todayBr(): string {
  const n = new Date();
  const dd = String(n.getDate()).padStart(2, '0');
  const mm = String(n.getMonth() + 1).padStart(2, '0');
  const yyyy = n.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** Converte dd/mm/aaaa (calendário local) para YYYY-MM-DD. */
function parseBrDateToIso(br: string): string | null {
  const s = String(br).trim();
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yyyy < 1900 || yyyy > 2100) {
    return null;
  }
  const d = new Date(yyyy, mm - 1, dd);
  if (
    d.getFullYear() !== yyyy ||
    d.getMonth() !== mm - 1 ||
    d.getDate() !== dd
  ) {
    return null;
  }
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

/** Converte ddmmaaaa (só dígitos) para YYYY-MM-DD. */
function parseDdmmyyyyToIso(digits: string): string | null {
  const d = digits.replace(/\D/g, '');
  if (d.length !== 8) return null;
  const dd = Number(d.slice(0, 2));
  const mm = Number(d.slice(2, 4));
  const yyyy = Number(d.slice(4, 8));
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yyyy < 1900 || yyyy > 2100) {
    return null;
  }
  const cal = new Date(yyyy, mm - 1, dd);
  if (
    cal.getFullYear() !== yyyy ||
    cal.getMonth() !== mm - 1 ||
    cal.getDate() !== dd
  ) {
    return null;
  }
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

const REMEMBER_LOGIN_KEY = 'gf_driver_remember_login';

type RememberedLogin = { cpf: string; senha: string };

function readRememberedLogin(): RememberedLogin | null {
  try {
    const raw = localStorage.getItem(REMEMBER_LOGIN_KEY);
    if (!raw) return null;
    const j = JSON.parse(raw) as RememberedLogin;
    if (typeof j.cpf === 'string' && typeof j.senha === 'string') return j;
  } catch {
    /* ignore */
  }
  return null;
}

function writeRememberedLogin(cpf: string, senha: string) {
  localStorage.setItem(
    REMEMBER_LOGIN_KEY,
    JSON.stringify({ cpf, senha }),
  );
}

function clearRememberedLogin() {
  localStorage.removeItem(REMEMBER_LOGIN_KEY);
}

async function nestErrorMessage(
  res: Response,
  fallback: string,
): Promise<string> {
  try {
    const j = (await res.json()) as { message?: string | string[] };
    const m = j?.message;
    if (typeof m === 'string') return m;
    if (Array.isArray(m)) return m.join(' ');
  } catch {
    /* ignore */
  }
  return fallback;
}

export function registerAlpineComponents(Alpine: AlpineType): void {
  Alpine.data('motoristaApp', () => ({
    view: 'loading' as 'loading' | 'login' | 'app',
    tab: 'abastecimento' as 'abastecimento' | 'relatorios' | 'config',
    fuelingFlow: 'list' as 'list' | 'form',
    drawerOpen: false,
    error: '',
    cpf: '',
    /** Senha no formato ddmmaaaa (data de nascimento). */
    loginSenha: '',
    lembrarSenha: false,
    me: null as MeResponse | null,
    serverFuelings: [] as FuelingItem[],
    pendingRows: [] as Awaited<ReturnType<typeof allPending>>,
    qty: '',
    km: '',
    /** Data do abastecimento (dd/mm/aaaa). */
    dataAbastecimentoBr: todayBr(),
    receiptFile: null as File | null,
    syncing: false,
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    /** Chromium: há evento guardado para `prompt()`. */
    pwaShowInstallButton: false,
    /** Safari iOS: não há `beforeinstallprompt`; mostrar instruções. */
    pwaIosInstallHint: false,
    pwaInstalledUi: false,
    fmtDate,
    fmtDateTime,
    fmtLiters,
    fmtDashboardLiters,
    getApiBase,
    maskCpf,

    dashboardTotalLiters(): number {
      let s = 0;
      for (const it of this.serverFuelings) {
        s += toLitersValue(it.quantityLiters);
      }
      for (const p of this.pendingRows) {
        s += p.quantityLiters;
      }
      return s;
    },

    dashboardRecordCount(): number {
      return this.serverFuelings.length + this.pendingRows.length;
    },

    dashboardAvgLiters(): number {
      const c = this.dashboardRecordCount();
      return c > 0 ? this.dashboardTotalLiters() / c : 0;
    },

    dashboardSyncedCount(): number {
      return this.serverFuelings.length;
    },

    dashboardPendingSyncCount(): number {
      return this.pendingRows.length;
    },

    listRows(): FuelListRow[] {
      const pending: FuelListRow[] = this.pendingRows.map((p) => ({
        kind: 'pending',
        key: p.offlineClientId,
        liters: p.quantityLiters,
        km: p.odometerKm,
        fuelDateIso:
          p.fuelDateIso ?? p.lancadoEm.slice(0, 10),
        lancadoEm: p.lancadoEm,
        savedAt: p.savedAt,
      }));
      const server: FuelListRow[] = this.serverFuelings.map((item) => ({
        kind: 'server',
        key: item.id,
        item,
      }));
      const all = [...pending, ...server];
      all.sort((a, b) => {
        const ta =
          a.kind === 'pending'
            ? new Date(a.lancadoEm).getTime()
            : new Date(a.item.createdAt).getTime();
        const tb =
          b.kind === 'pending'
            ? new Date(b.lancadoEm).getTime()
            : new Date(b.item.createdAt).getTime();
        return tb - ta;
      });
      return all;
    },

    vehicleTitle(): string {
      const v = this.me?.currentVehicle;
      if (!v) return 'Sem veículo';
      return `${v.plate} · ${v.brand} ${v.model}`.trim();
    },

    openRegisterForm() {
      this.error = '';
      this.dataAbastecimentoBr = todayBr();
      this.receiptFile = null;
      this.clearReceiptInputs();
      this.fuelingFlow = 'form';
    },

    clearReceiptInputs() {
      const r = (this as unknown as {
        $refs?: { receiptCam?: HTMLInputElement; receiptGal?: HTMLInputElement };
      }).$refs;
      if (r?.receiptCam) r.receiptCam.value = '';
      if (r?.receiptGal) r.receiptGal.value = '';
    },

    onReceiptPicked(ev: Event) {
      const t = ev.target as HTMLInputElement;
      this.receiptFile = t.files?.[0] ?? null;
    },

    /** Mantém máscara dd/mm/aaaa só com dígitos. */
    formatDataAbastecimentoInput(ev: Event) {
      const el = ev.target as HTMLInputElement;
      const digits = el.value.replace(/\D/g, '').slice(0, 8);
      let out = digits;
      if (digits.length > 4) {
        out = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
      } else if (digits.length > 2) {
        out = `${digits.slice(0, 2)}/${digits.slice(2)}`;
      }
      this.dataAbastecimentoBr = out;
    },

    closeRegisterForm() {
      this.fuelingFlow = 'list';
      this.error = '';
    },

    setTab(t: 'abastecimento' | 'relatorios' | 'config') {
      this.tab = t;
      this.drawerOpen = false;
      if (t === 'config') this.syncPwaInstallUi();
      if (t !== 'abastecimento') this.fuelingFlow = 'list';
      if (t === 'relatorios' && this.view === 'app') {
        void this.loadFuelings();
        void this.refreshPendingList();
      }
    },

    applyRememberedLogin() {
      const r = readRememberedLogin();
      if (r) {
        this.cpf = r.cpf;
        this.loginSenha = r.senha;
        this.lembrarSenha = true;
      } else {
        this.lembrarSenha = false;
      }
    },

    syncPwaInstallUi() {
      if (isStandaloneDisplay()) {
        this.pwaInstalledUi = true;
        this.pwaShowInstallButton = false;
        this.pwaIosInstallHint = false;
        return;
      }
      this.pwaInstalledUi = false;
      this.pwaShowInstallButton = hasDeferredInstallPrompt();
      this.pwaIosInstallHint =
        !this.pwaShowInstallButton && isLikelyIosSafari();
    },

    async installPwaApp() {
      const ok = await promptPwaInstall();
      this.syncPwaInstallUi();
      if (ok) {
        this.error = '';
      }
    },

    async init() {
      this.syncPwaInstallUi();
      const onInstallReady = () => this.syncPwaInstallUi();
      const onInstalled = () => this.syncPwaInstallUi();
      window.addEventListener('gf-pwa-install-ready', onInstallReady);
      window.addEventListener('gf-pwa-installed', onInstalled);

      window.addEventListener('online', () => {
        this.online = true;
      });
      window.addEventListener('offline', () => {
        this.online = false;
      });
      window.addEventListener('gf-pending-synced', () => {
        void this.refreshPendingList();
        if (this.view === 'app') void this.loadFuelings();
      });
      await this.refreshPendingList();
      if (!getAccessToken()) {
        this.applyRememberedLogin();
        this.view = 'login';
        return;
      }
      const ok = await this.loadMe();
      if (!ok) {
        clearTokens();
        this.applyRememberedLogin();
        this.view = 'login';
        return;
      }
      this.error = '';
      this.view = 'app';
      await this.loadFuelings();
      void syncPendingFuelings();
    },

    async refreshPendingList() {
      const rows = await allPending();
      rows.sort((a, b) => b.savedAt - a.savedAt);
      this.pendingRows = rows;
    },

    async loadMe(): Promise<boolean> {
      const res = await apiFetch('/driver/me');
      if (!res.ok) {
        const fallback =
          res.status === 401
            ? 'Sessão inválida ou expirada. Entre novamente.'
            : 'Não foi possível carregar o perfil.';
        this.error = await nestErrorMessage(res, fallback);
        return false;
      }
      this.me = (await res.json()) as MeResponse;
      return true;
    },

    async refreshAssignment() {
      this.error = '';
      const ok = await this.loadMe();
      if (ok) await this.loadFuelings();
    },

    async loadFuelings() {
      const res = await apiFetch('/driver/fuelings?take=100');
      if (!res.ok) return;
      const data = (await res.json()) as { items: FuelingItem[] };
      this.serverFuelings = data.items;
    },

    async submitLogin() {
      this.error = '';
      const cpf = String(this.cpf).replace(/\D/g, '');
      if (cpf.length !== 11) {
        this.error = 'Informe o CPF com 11 dígitos.';
        return;
      }
      const birthDateIso = parseDdmmyyyyToIso(this.loginSenha);
      if (!birthDateIso) {
        this.error = 'Informe a senha com 8 dígitos (data de nascimento).';
        return;
      }
      try {
        const res = await fetch(`${getApiBase()}/driver-auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cpf,
            birthDate: birthDateIso,
          }),
        });
        if (!res.ok) {
          this.error = 'Credenciais inválidas';
          return;
        }
        const data = (await res.json()) as {
          accessToken: string;
          refreshToken: string;
        };
        setTokens(data.accessToken, data.refreshToken);
        const ok = await this.loadMe();
        if (!ok) {
          clearTokens();
          return;
        }
        if (this.lembrarSenha) {
          writeRememberedLogin(cpf, this.loginSenha);
        } else {
          clearRememberedLogin();
        }
        this.view = 'app';
        await this.loadFuelings();
        void syncPendingFuelings();
      } catch {
        this.error =
          'Não foi possível conectar à API. Em desenvolvimento: apague VITE_API_URL do .env do PWA (usa proxy sem CORS) ou inclua http://localhost:5173 em CORS_ORIGIN na API e reinicie a API.';
      }
    },

    async submitFueling() {
      this.error = '';
      if (!this.me?.currentVehicle) {
        this.error =
          'Sem veículo vinculado. Peça ao administrador um vínculo ativo e toque em «Atualizar».';
        return;
      }
      const q = Number(String(this.qty).replace(',', '.'));
      const k = Number(String(this.km).replace(/\D/g, ''));
      if (!Number.isFinite(q) || q <= 0) {
        this.error = 'Informe a quantidade em litros.';
        return;
      }
      if (!Number.isFinite(k) || k < 0) {
        this.error = 'Informe a quilometragem.';
        return;
      }
      const file = this.receiptFile;
      if (!file) {
        this.error = 'Anexe o comprovante.';
        return;
      }
      const fuelDateIso = parseBrDateToIso(this.dataAbastecimentoBr);
      if (!fuelDateIso) {
        this.error = 'Informe a data do abastecimento (dd/mm/aaaa).';
        return;
      }
      const lancadoEm = new Date().toISOString();
      const offlineClientId = crypto.randomUUID();

      if (!this.online) {
        const buf = await file.arrayBuffer();
        await addPending({
          offlineClientId,
          fuelDateIso,
          quantityLiters: q,
          odometerKm: Math.floor(k),
          lancadoEm,
          receiptName: file.name || 'comprovante.jpg',
          receiptType: file.type || 'image/jpeg',
          receiptData: buf,
          savedAt: Date.now(),
        });
        await this.refreshPendingList();
        await registerFuelingsBackgroundSync();
        this.qty = '';
        this.km = '';
        this.receiptFile = null;
        this.clearReceiptInputs();
        this.dataAbastecimentoBr = todayBr();
        this.fuelingFlow = 'list';
        return;
      }

      const fd = new FormData();
      fd.append('quantityLiters', String(q));
      fd.append('odometerKm', String(Math.floor(k)));
      fd.append('fuelDate', fuelDateIso);
      fd.append('lancadoEm', lancadoEm);
      fd.append('offlineClientId', offlineClientId);
      fd.append('receipt', file);
      const res = await apiFetch('/driver/fuelings', { method: 'POST', body: fd });
      if (!res.ok) {
        let msg = 'Falha ao enviar';
        try {
          const j = (await res.json()) as { message?: string | string[] };
          if (typeof j.message === 'string') msg = j.message;
          else if (Array.isArray(j.message)) msg = j.message.join(', ');
        } catch {
          /* ignore */
        }
        this.error = msg;
        return;
      }
      this.qty = '';
      this.km = '';
      this.receiptFile = null;
      this.clearReceiptInputs();
      this.dataAbastecimentoBr = todayBr();
      await this.loadFuelings();
      this.fuelingFlow = 'list';
    },

    async runSync() {
      if (this.syncing) return;
      this.syncing = true;
      try {
        await syncPendingFuelings();
        await this.refreshPendingList();
        if (this.view === 'app') await this.loadFuelings();
      } finally {
        this.syncing = false;
      }
    },

    logout() {
      clearTokens();
      this.me = null;
      this.serverFuelings = [];
      this.tab = 'abastecimento';
      this.fuelingFlow = 'list';
      this.drawerOpen = false;
      this.applyRememberedLogin();
      this.view = 'login';
      this.syncPwaInstallUi();
    },
  }));
}
