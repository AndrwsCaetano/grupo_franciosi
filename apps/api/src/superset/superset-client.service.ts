import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GuestTokenUser {
  username: string;
  firstName?: string;
  lastName?: string;
}

export interface GuestTokenRls {
  /** Cláusula SQL aplicada como Row Level Security. */
  clause: string;
  /** Opcional: restringe a RLS a um dataset específico. */
  dataset?: number;
}

/**
 * Cliente HTTP do Apache Superset.
 *
 * Responsável por autenticar a service account (admin), obter CSRF token e
 * emitir guest tokens de curta duração para embutir dashboards no painel.
 * Usa `fetch` nativo (Node 18+), sem dependências adicionais.
 */
@Injectable()
export class SupersetClientService {
  private readonly logger = new Logger(SupersetClientService.name);

  private accessToken: string | null = null;
  private accessTokenExpiresAt = 0;

  constructor(private readonly config: ConfigService) {}

  private get baseUrl(): string {
    const url = this.config.get<string>('SUPERSET_BASE_URL');
    if (!url) {
      throw new InternalServerErrorException(
        'SUPERSET_BASE_URL não configurada',
      );
    }
    return url.replace(/\/+$/, '');
  }

  /** URL pública usada pelo iframe embutido (frontend). */
  getPublicUrl(): string {
    return (
      this.config.get<string>('SUPERSET_PUBLIC_URL') ?? this.baseUrl
    ).replace(/\/+$/, '');
  }

  private async request<T>(
    path: string,
    init: RequestInit,
  ): Promise<{ data: T; res: Response }> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, init);
    } catch (err) {
      this.logger.error(`Falha ao contatar Superset em ${path}: ${err}`);
      throw new ServiceUnavailableException(
        'Não foi possível contatar o Superset',
      );
    }
    const text = await res.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
    if (!res.ok) {
      this.logger.error(
        `Superset ${path} respondeu ${res.status}: ${
          typeof data === 'string' ? data : JSON.stringify(data)
        }`,
      );
      throw new ServiceUnavailableException(
        `Erro na API do Superset (${res.status})`,
      );
    }
    return { data: data as T, res };
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.accessTokenExpiresAt) {
      return this.accessToken;
    }
    const username = this.config.get<string>('SUPERSET_API_USER');
    const password = this.config.get<string>('SUPERSET_API_PASSWORD');
    if (!username || !password) {
      throw new InternalServerErrorException(
        'SUPERSET_API_USER / SUPERSET_API_PASSWORD não configurados',
      );
    }
    const { data } = await this.request<{ access_token: string }>(
      '/api/v1/security/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          provider: 'db',
          refresh: true,
        }),
      },
    );
    this.accessToken = data.access_token;
    // Tokens do Superset duram ~5min por padrão; renova com folga (4min).
    this.accessTokenExpiresAt = now + 4 * 60 * 1000;
    return this.accessToken;
  }

  private async getCsrf(
    accessToken: string,
  ): Promise<{ csrfToken: string; cookie: string }> {
    const { data, res } = await this.request<{ result: string }>(
      '/api/v1/security/csrf_token/',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      },
    );
    const setCookie = res.headers.get('set-cookie') ?? '';
    // Mantém apenas o par chave=valor de cada cookie retornado.
    const cookie = setCookie
      .split(/,(?=[^;]+?=)/)
      .map((c) => c.split(';')[0].trim())
      .filter(Boolean)
      .join('; ');
    return { csrfToken: data.result, cookie };
  }

  /**
   * Gera um guest token escopado a um dashboard embutido (embeddedUuid),
   * identificando o usuário do painel e aplicando RLS opcional.
   */
  async createGuestToken(
    embeddedUuid: string,
    user: GuestTokenUser,
    rls: GuestTokenRls[] = [],
  ): Promise<string> {
    const accessToken = await this.getAccessToken();
    const { csrfToken, cookie } = await this.getCsrf(accessToken);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'X-CSRFToken': csrfToken,
    };
    if (cookie) {
      headers.Cookie = cookie;
    }

    const { data } = await this.request<{ token: string }>(
      '/api/v1/security/guest_token/',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          user: {
            username: user.username,
            first_name: user.firstName ?? user.username,
            last_name: user.lastName ?? '',
          },
          resources: [{ type: 'dashboard', id: embeddedUuid }],
          rls,
        }),
      },
    );
    return data.token;
  }
}
