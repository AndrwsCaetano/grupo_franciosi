# Grupo Franciosi — Monorepo

Monorepo **próprio** (npm workspaces + [Turborepo](https://turbo.build)) para backend, painel administrativo e PWA.

## Estrutura

| Pasta | Conteúdo |
|--------|----------|
| `apps/api` | API NestJS, Prisma, PostgreSQL |
| `apps/web-admin` | Painel (TailAdmin + Alpine + Webpack) |
| `apps/pwa` | Reservado para PWA (fase posterior) |
| `packages/shared` | Pacote `@grupo-franciosi/shared` (constantes e tipos partilhados) |

## Requisitos

- Node.js 18+
- Docker (Postgres local via `docker compose`)

## Primeira configuração

```bash
npm install
npm run db:up
npm run db:migrate
npm run db:seed
```

O pacote `shared` compila no `prepare` após instalar dependências.

## Comandos úteis

| Comando | Descrição |
|---------|-----------|
| `npm run dev:api` | API em http://localhost:4000 |
| `npm run dev:admin` | Painel em http://localhost:3000 |
| `npm run build` | Build de todos os pacotes (Turbo) |
| `npm run db:up` / `db:down` | Sobe ou para o Postgres |
| `npm run db:migrate` | Migrações Prisma |
| `npm run db:seed` | Dados iniciais |

Variáveis: ver `apps/api/.env.example` e `.env.example` na raiz (Docker).

## Deploy em produção (VPS, um único comando)

A imagem da API já vem com o **Oracle Instant Client embutido** (modo *thick*),
então qualquer servidor Linux x86_64 funciona — não precisa instalar nada
manualmente.

```bash
# 1. Clone o repositório na VPS
git clone <repo-url> /opt/grupo_franciosi
cd /opt/grupo_franciosi

# 2. Crie o arquivo de ambiente a partir do exemplo e ajuste senhas/segredos
cp .env.production.example .env.production
nano .env.production      # POSTGRES_PASSWORD, DATABASE_URL, JWT_SECRET, CORS_ORIGIN

# 3. Suba tudo (postgres + api + nginx) com um único comando
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Depois disso o painel está em `http://<ip-da-vps>` (porta `WEB_PORT`, default 80).
Login inicial: `admin@local.dev` / `Admin123!` (troque a senha em **Meu perfil**).

Atualizações futuras:

```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

O entrypoint da API roda automaticamente `prisma migrate deploy` e o seed
(idempotente) a cada start. Para pular o seed após o primeiro deploy, defina
`RUN_SEED=0` no `.env.production`.

### Alvos ARM (Raspberry Pi, Graviton, etc.)

A imagem só baixa o Instant Client em `linux/amd64`. Em ARM a API sobe em
modo *thin* — funciona com Postgres, MariaDB e SQL Server, mas Oracle exige
modo *thick*. Se precisar de Oracle em ARM, monte um Instant Client ARM e
ajuste o `ORACLE_CLIENT_LIB_DIR` no compose.
