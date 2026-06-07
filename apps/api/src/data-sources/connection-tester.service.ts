import * as fs from 'node:fs';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { DataSourceType } from '@prisma/client';

export interface ConnectionInput {
  type: DataSourceType;
  host: string;
  port: number;
  databaseName: string;
  username: string;
  password: string;
  ssl?: boolean;
  /** Campos específicos por driver. Para Oracle: { serviceName?, sid? } */
  extra?: Record<string, unknown> | null;
}

export interface ConnectionTestResult {
  ok: boolean;
  serverInfo?: string;
  /** Latência em ms da conexão+query de ping. */
  latencyMs?: number;
  error?: string;
  /** Tipo testado (echo). */
  type: DataSourceType;
}

const DEFAULT_TIMEOUT_MS = 8000;

// Os drivers são carregados sob demanda via require dinâmico para não exigir
// que todos estejam disponíveis em build time.
function loadDriver(name: string): unknown {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(name);
}

@Injectable()
export class ConnectionTesterService implements OnModuleInit {
  private readonly logger = new Logger(ConnectionTesterService.name);
  private oracleThickInitialized = false;

  onModuleInit(): void {
    this.tryInitOracleThickMode();
  }

  /**
   * Se a env var ORACLE_CLIENT_LIB_DIR (ou ORACLE_HOME) estiver definida e
   * apontar para um diretório válido do Oracle Instant Client, ativa o modo
   * "thick" do node-oracledb. Necessário quando o servidor Oracle usa o
   * password verifier 12C (NJS-116 no modo thin).
   */
  private tryInitOracleThickMode(): void {
    const libDir = (
      process.env.ORACLE_CLIENT_LIB_DIR ||
      process.env.ORACLE_HOME ||
      ''
    ).trim();
    const forceThick =
      process.env.ORACLE_INIT_THICK === '1' ||
      process.env.ORACLE_INIT_THICK === 'true';
    if (!libDir && !forceThick) {
      return;
    }
    if (libDir && !fs.existsSync(libDir)) {
      this.logger.warn(
        `[oracledb] ORACLE_CLIENT_LIB_DIR="${libDir}" não existe — continuando em modo thin.`,
      );
      return;
    }
    try {
      const oracledb = loadDriver('oracledb') as typeof import('oracledb');
      if (libDir) {
        oracledb.initOracleClient({ libDir });
      } else {
        // ORACLE_INIT_THICK=1 sem libDir → assume DLLs no PATH
        oracledb.initOracleClient();
      }
      this.oracleThickInitialized = true;
      this.logger.log(
        libDir
          ? `Oracle Instant Client inicializado em modo thick (${libDir})`
          : 'Oracle Instant Client inicializado em modo thick (DLLs do PATH)',
      );
    } catch (e) {
      this.logger.warn(
        `Não foi possível ativar o modo thick do oracledb${
          libDir ? ` (${libDir})` : ''
        }: ${(e as Error).message}. Continuando em modo thin.`,
      );
    }
  }

  async test(input: ConnectionInput): Promise<ConnectionTestResult> {
    const t0 = Date.now();
    try {
      switch (input.type) {
        case 'POSTGRES':
          return await this.testPostgres(input, t0);
        case 'MARIADB':
          return await this.testMariaDb(input, t0);
        case 'ORACLE':
          return await this.testOracle(input, t0);
        case 'SQLSERVER':
          return await this.testSqlServer(input, t0);
        default:
          return {
            ok: false,
            error: `Tipo não suportado: ${String(input.type)}`,
            type: input.type,
          };
      }
    } catch (err) {
      const rawMessage = (err as Error).message;
      const message = this.translateError(input.type, rawMessage);
      this.logger.warn(
        `Falha ao testar conexão ${input.type}@${input.host}:${input.port}: ${rawMessage}`,
      );
      return {
        ok: false,
        error: message,
        type: input.type,
        latencyMs: Date.now() - t0,
      };
    }
  }

  private translateError(type: DataSourceType, raw: string): string {
    if (type === 'ORACLE') {
      // Password verifier 12C — só funciona em modo thick (Instant Client).
      if (/NJS-116/i.test(raw) || /password verifier type/i.test(raw)) {
        return (
          'Esta conta Oracle usa autenticação 12C (verifier 0x939), que só é ' +
          'suportada no modo thick do node-oracledb. Para resolver: instale o ' +
          'Oracle Instant Client e configure a variável de ambiente ' +
          'ORACLE_CLIENT_LIB_DIR apontando para o diretório do client; ou peça ' +
          'ao DBA para recriar o usuário com SQLNET.ALLOWED_LOGON_VERSION_SERVER=11. ' +
          `(${raw})`
        );
      }
      if (/ORA-01017/i.test(raw)) {
        return `Usuário ou senha inválidos. (${raw})`;
      }
      if (/ORA-12541/i.test(raw)) {
        return `Listener Oracle não responde no host/porta informados. (${raw})`;
      }
      if (/ORA-12514/i.test(raw)) {
        return (
          'Service name não conhecido pelo listener Oracle. Confirme o nome ' +
          `do serviço (ou informe um SID em "Avançado": {"sid":"..."}). (${raw})`
        );
      }
    }
    return raw;
  }

  private async testPostgres(
    input: ConnectionInput,
    t0: number,
  ): Promise<ConnectionTestResult> {
    const pg = loadDriver('pg') as typeof import('pg');
    const client = new pg.Client({
      host: input.host,
      port: input.port,
      database: input.databaseName,
      user: input.username,
      password: input.password,
      ssl: input.ssl ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: DEFAULT_TIMEOUT_MS,
      statement_timeout: DEFAULT_TIMEOUT_MS,
    });
    try {
      await client.connect();
      const result = await client.query<{ version: string }>(
        'SELECT version() AS version',
      );
      return {
        ok: true,
        serverInfo: result.rows[0]?.version,
        latencyMs: Date.now() - t0,
        type: input.type,
      };
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  private async testMariaDb(
    input: ConnectionInput,
    t0: number,
  ): Promise<ConnectionTestResult> {
    const mysql = loadDriver('mysql2/promise') as typeof import('mysql2/promise');
    const conn = await mysql.createConnection({
      host: input.host,
      port: input.port,
      database: input.databaseName || undefined,
      user: input.username,
      password: input.password,
      ssl: input.ssl ? { rejectUnauthorized: false } : undefined,
      connectTimeout: DEFAULT_TIMEOUT_MS,
    });
    try {
      const [rows] = (await conn.query('SELECT VERSION() AS version')) as [
        Array<{ version: string }>,
        unknown,
      ];
      return {
        ok: true,
        serverInfo: rows[0]?.version,
        latencyMs: Date.now() - t0,
        type: input.type,
      };
    } finally {
      await conn.end().catch(() => undefined);
    }
  }

  /**
   * Monta o connectString do Oracle a partir do input. Aceita serviceName
   * (padrão, via databaseName ou extra.serviceName) ou SID (via extra.sid).
   */
  private buildOracleConnectString(input: ConnectionInput): string {
    // Oracle aceita serviceName ou SID. databaseName é tratado como serviceName por padrão.
    // Forçar SID via extra: { sid: "XE" } ou serviceName via extra: { serviceName: "ORCLPDB1" }.
    const extra = (input.extra || {}) as { sid?: string; serviceName?: string };
    const sid = typeof extra.sid === 'string' ? extra.sid : undefined;
    const serviceName =
      typeof extra.serviceName === 'string'
        ? extra.serviceName
        : input.databaseName || undefined;

    if (sid) {
      return `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${input.host})(PORT=${input.port}))(CONNECT_DATA=(SID=${sid})))`;
    }
    if (serviceName) {
      return `${input.host}:${input.port}/${serviceName}`;
    }
    throw new Error(
      'Para Oracle informe o nome do serviço em "Banco / Database" ou um SID em "extra.sid".',
    );
  }

  /**
   * Executa um SELECT em uma conexão Oracle e devolve as linhas como objetos
   * (chave = nome da coluna). Reaproveita o init thick-mode já configurado.
   *
   * Se `extra.schema` (ou `extra.currentSchema`) estiver definido, aplica
   * `ALTER SESSION SET CURRENT_SCHEMA` antes da query — útil quando as tabelas
   * pertencem a outro owner e não há sinônimos para o usuário de leitura.
   */
  async runOracleSelect(
    input: ConnectionInput,
    sql: string,
  ): Promise<Record<string, unknown>[]> {
    const oracledb = loadDriver('oracledb') as typeof import('oracledb');
    const connectString = this.buildOracleConnectString(input);
    let conn: import('oracledb').Connection | undefined;
    try {
      conn = await oracledb.getConnection({
        user: input.username,
        password: input.password,
        connectString,
      });
      const extra = (input.extra || {}) as {
        schema?: string;
        currentSchema?: string;
      };
      const schema =
        typeof extra.schema === 'string'
          ? extra.schema
          : typeof extra.currentSchema === 'string'
            ? extra.currentSchema
            : undefined;
      if (schema) {
        if (!/^[A-Za-z0-9_$#]+$/.test(schema)) {
          throw new Error(`Schema Oracle inválido: "${schema}".`);
        }
        await conn.execute(`ALTER SESSION SET CURRENT_SCHEMA = ${schema}`);
      }
      const result = await conn.execute(sql, [], {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });
      return (result.rows as Record<string, unknown>[]) || [];
    } catch (err) {
      const raw = (err as Error).message;
      this.logger.warn(
        `Falha ao executar SELECT Oracle@${input.host}:${input.port}: ${raw}`,
      );
      throw new Error(this.translateError('ORACLE', raw));
    } finally {
      if (conn) {
        await conn.close().catch(() => undefined);
      }
    }
  }

  private async testOracle(
    input: ConnectionInput,
    t0: number,
  ): Promise<ConnectionTestResult> {
    const oracledb = loadDriver('oracledb') as typeof import('oracledb');
    const connectString = this.buildOracleConnectString(input);

    const conn = await oracledb.getConnection({
      user: input.username,
      password: input.password,
      connectString,
    });
    try {
      const result = await conn.execute(
        "SELECT BANNER AS V FROM V$VERSION WHERE ROWNUM = 1",
      );
      const rows = (result.rows as unknown[][]) || [];
      const banner =
        rows.length > 0 && Array.isArray(rows[0]) ? String(rows[0][0]) : 'Oracle Database';
      return {
        ok: true,
        serverInfo: banner,
        latencyMs: Date.now() - t0,
        type: input.type,
      };
    } finally {
      await conn.close().catch(() => undefined);
    }
  }

  private async testSqlServer(
    input: ConnectionInput,
    t0: number,
  ): Promise<ConnectionTestResult> {
    const mssql = loadDriver('mssql') as typeof import('mssql');
    const extra = (input.extra || {}) as { instance?: string };
    const pool = await mssql.connect({
      server: input.host,
      port: input.port,
      database: input.databaseName || undefined,
      user: input.username,
      password: input.password,
      options: {
        encrypt: !!input.ssl,
        trustServerCertificate: true,
        instanceName: extra.instance,
      },
      connectionTimeout: DEFAULT_TIMEOUT_MS,
      requestTimeout: DEFAULT_TIMEOUT_MS,
    });
    try {
      const result = await pool.request().query<{ version: string }>(
        'SELECT @@VERSION AS version',
      );
      const ver = result.recordset[0]?.version;
      return {
        ok: true,
        serverInfo: typeof ver === 'string' ? ver.split('\n')[0] : undefined,
        latencyMs: Date.now() - t0,
        type: input.type,
      };
    } finally {
      await pool.close().catch(() => undefined);
    }
  }
}
