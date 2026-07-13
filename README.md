# Grupo Franciosi — Monorepo

Monorepo **próprio** (npm workspaces + [Turborepo](https://turbo.build)) para backend, painel administrativo e PWA.

## Estrutura

| Pasta | Conteúdo |
|--------|----------|
| `apps/api` | API NestJS, Prisma, PostgreSQL |
| `apps/web-admin` | Painel (TailAdmin + Alpine + Webpack) |
| `apps/pwa` | PWA do motorista (abastecimento de veículos, offline) |
| `apps/posto` | App Expo (React Native) — Ponto de Abastecimento (offline-first, SQLite) |
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
| `npm run dev:pwa` | PWA do motorista (`apps/pwa`) em modo Vite |
| `npm run dev:posto` | Expo Metro do app Ponto de Abastecimento (`apps/posto`) |
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

O entrypoint da API roda automaticamente `prisma migrate deploy`, sincroniza
as opções de `packages/shared/src/permissions.ts` (sempre, mesmo com
`RUN_SEED=0`) e o seed completo (idempotente) se `RUN_SEED=1`. Para pular o
seed após o primeiro deploy, defina `RUN_SEED=0` no `.env.production` — novas
opções do catálogo shared ainda são aplicadas a cada restart da API.

Após adicionar relatórios ou opções novas, se preferir sincronizar sem reiniciar:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec api npx tsx prisma/sync-permissions.ts
```

### Módulo Posto de Combustível — checklist de deploy

O módulo **Posto de combustível / Abastecimento** (painel + API) adiciona:

- Migration Prisma `20260713170000_fuel_station` (tabelas `FuelProduct`,
  `FuelPoint`, `FuelStock`, `Machinery`, `FuelDispensing`, `FuelTransfer`,
  `FuelStockMovement`, `FuelErpImport`, `FuelSyncLog`, `UserFuelPointAccess` +
  enums correlatos).
- Permissões `fuel_station.read`, `fuel_station.write`, `fuel_station.operate`,
  `fuel_station.validate` e `fuel_station.transfers` em
  `packages/shared/src/permissions.ts`.
- 7 páginas novas no `web-admin` (`fuel-points.html`, `fuel-products.html`,
  `fuel-machinery.html`, `fuel-erp-imports.html`, `fuel-dispensings.html`,
  `fuel-transfers.html`, `fuel-point-access.html`) + entrada
  "Posto de combustível" no `sidebar.html`.
- Proxy `/fuel-station` em `nginx.conf` (já configurado).

Para promover à VPS **sem quebrar o menu "Abastecimento Veículo" existente**:

```bash
# 1) na VPS, na raiz do repo:
cd /opt/grupo_franciosi
git pull

# 2) rebuild + restart (rebuilda web-admin com sidebar novo e API com módulo novo):
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# O entrypoint da API roda automaticamente:
#   - prisma migrate deploy      -> aplica 20260713170000_fuel_station
#   - sync-permissions.ts        -> cria fuel_station.* e concede ao perfil Administrador
#   - prisma db seed (RUN_SEED=1) -> semeia dados de demonstração (idempotente)

# 3) (opcional) verificar logs:
docker compose -f docker-compose.prod.yml --env-file .env.production logs api --tail 80
docker compose -f docker-compose.prod.yml --env-file .env.production logs web --tail 30
```

Após o `up -d --build`, abra o painel: o menu **Posto de combustível** aparece
imediatamente para o usuário `admin` (via bypass `isAdmin`). Usuários vinculados
ao perfil **Administrador** também veem o menu automaticamente — a
`guard.js` faz um `GET /auth/me` em background em toda página protegida e
atualiza o cache de permissões em `localStorage`, então basta recarregar. Para
usuários com perfis customizados, edite o perfil em **Administração → Perfis**
e marque as opções `fuel_station.*` desejadas.

Se algo der errado, o rollback é o padrão: `git checkout <sha anterior> &&
docker compose ... up -d --build`. A migration `20260713170000_fuel_station`
não altera nenhuma tabela existente (só cria novas), então pode ser mantida no
banco mesmo após rollback do código.

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

### Configuração inicial (produção / VPS)

1. **DNS** — crie o registro `bi.grupofranciosi.agrigestao.tech` apontando para o
   IP da VPS (o Traefik gera o certificado Let's Encrypt na primeira requisição).
2. **Variáveis** — em `.env.production`, preencha `SUPERSET_*` (ver
   `.env.production.example`). Ao criar o arquivo com
   `./scripts/prepare-env-production.sh`, os segredos `SUPERSET_SECRET_KEY`,
   `SUPERSET_GUEST_TOKEN_SECRET`, `SUPERSET_DB_PASSWORD` e
   `SUPERSET_ADMIN_PASSWORD` são gerados automaticamente — **anote a senha do
   admin do BI**.
3. **Subir só o Superset** (recomendado na primeira vez ou se o BI ainda não roda):

   ```bash
   chmod +x scripts/setup-superset-prod.sh
   ./scripts/setup-superset-prod.sh
   ```

   O script valida o `.env`, builda a imagem, roda `superset-init` (migrations +
   admin + roles) e sobe `superset`, `superset-worker`, `redis` e `superset-db`.
4. **Ou subir o stack completo** (inclui Superset):

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
   ```
5. Acesse `https://bi.grupofranciosi.agrigestao.tech` e faça login com
   `SUPERSET_ADMIN_USERNAME` / `SUPERSET_ADMIN_PASSWORD`.

**Diagnóstico** se o BI não abre:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production ps superset superset-worker superset-db
docker compose -f docker-compose.prod.yml --env-file .env.production logs superset-init --tail 80
docker compose -f docker-compose.prod.yml --env-file .env.production logs superset --tail 50
```

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
