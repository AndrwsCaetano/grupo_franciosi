# Grupo Franciosi — Monorepo

Monorepo **próprio** (npm workspaces + [Turborepo](https://turbo.build)) para backend, painel administrativo e PWA.

## Estrutura

| Pasta | Conteúdo |
|--------|----------|
| `apps/api` | API NestJS, Prisma, PostgreSQL |
| `apps/web-admin` | Painel (TailAdmin + Alpine + Webpack) |
| `apps/pwa` | Reservado para PWA (fase posterior) |
| `apps/superset` | Configuração do Apache Superset (módulo de BI) |
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

## Módulo de BI (Apache Superset)

O painel embute dashboards do **Apache Superset** de forma nativa (iframe sem
login), usando o *Embedded SDK* + *guest token*. O Superset roda como serviço
próprio no `docker-compose.prod.yml` (containers `superset`, `superset-worker`,
`superset-init`, `superset-db` e `redis`), exposto pelo Traefik em
`bi.grupofranciosi.agrigestao.tech`.

### Arquitetura

```
web-admin (iframe) ──guest token──> API NestJS ──login + guest_token──> Superset
```

A API usa a conta admin do Superset (service account) para gerar um guest token
de curta duração escopado ao dashboard liberado para o usuário logado. O acesso
("quem vê qual dashboard") é controlado pelas tabelas do app
(`SupersetDashboard` / `UserSupersetDashboard`) e pelas permissões
`superset.read`, `superset.write` e `superset.assign`.

### Configuração inicial (produção)

1. Preencha as variáveis `SUPERSET_*` em `.env.production` (ver
   `.env.production.example`). Gere segredos fortes para `SUPERSET_SECRET_KEY`
   e `SUPERSET_GUEST_TOKEN_SECRET`.
2. Suba o stack normalmente:

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
   ```

   O `superset-init` aplica as migrations, cria o admin e inicializa as roles.
3. Acesse `https://bi.grupofranciosi.agrigestao.tech` e faça login com
   `SUPERSET_ADMIN_USERNAME` / `SUPERSET_ADMIN_PASSWORD`.

### Fluxo para publicar um dashboard no painel

1. **No Superset**: conecte o banco (Settings → Database Connections), crie os
   charts e monte o dashboard.
2. No dashboard, menu **... → Embed dashboard** → **Enable embedding**. Copie o
   **UUID** gerado e (se solicitado) adicione o domínio do painel
   (`grupofranciosi.agrigestao.tech`) à lista de origens permitidas.
3. **No painel** (`web-admin`), menu **BI / Superset → Dashboards**, aba
   **Gerenciar** (requer `superset.write`): clique em **Novo dashboard**,
   informe título, slug, a descrição e cole o **Embedded UUID**.
4. Clique em **Liberar** (requer `superset.assign`) e marque os usuários que
   poderão visualizar.
5. Os usuários liberados (com `superset.read`) veem o dashboard embutido na aba
   **Meus dashboards**.

### Desenvolvimento local

Para testar o embed localmente, aponte `SUPERSET_BASE_URL` /
`SUPERSET_PUBLIC_URL` (em `apps/api/.env`) para uma instância do Superset
acessível e configure `EMBEDDED_SUPERSET`, CORS e `frame-ancestors` para
`http://localhost:3000` (ver `apps/superset/superset_config.py`).
