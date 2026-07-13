# New Agrigestão — Ponto de Abastecimento (Expo)

App Expo (React Native) offline-first para operadores do ponto de abastecimento
interno. Sincroniza cadastros com a API NestJS e enfileira abastecimentos e
transferências para envio quando houver conexão.

> **Escopo**: este app é totalmente separado de `apps/pwa` (motorista) e do
> abastecimento de veículos. Ele consome novos endpoints `POST /auth/login`,
> `POST /auth/refresh` e `GET/POST /fuel-station/*`. Um usuário com a permissão
> `fuel_station.operate` é o público-alvo.

## Stack

- Expo SDK 52 (React Native 0.76)
- Expo Router (tabs + stack)
- TypeScript estrito
- `expo-sqlite` (persistência local WAL)
- `expo-camera` (leitura de QR Code)
- `expo-secure-store` (tokens JWT)
- `@react-native-community/netinfo` (detecção de conexão)
- `@react-native-async-storage/async-storage` (configurações leves)

## Estrutura

```
apps/posto/
  app/                     # rotas (expo-router)
    _layout.tsx            # providers globais (Auth/Session/Sync)
    index.tsx              # gate: redireciona p/ login, bootstrap ou tabs
    login.tsx
    bootstrap.tsx          # sincronização inicial + seleção do ponto
    (tabs)/
      _layout.tsx          # 6 abas inferiores
      dashboard.tsx        # início: saudação, ações rápidas, estoque
      estoque.tsx          # cards de estoque + histórico local
      maquinas.tsx         # busca/lista das máquinas, chips de status
      transfers.tsx        # aceites pendentes + histórico
      fila.tsx             # fila de sincronização (pendentes/erros)
      config.tsx           # operador, ponto, URL API, cache, logout
    abastecer/
      scan.tsx             # câmera + entrada manual + "simular QR"
      form.tsx             # confirmação da máquina + formulário
    transfers/
      new.tsx              # solicitar nova transferência
      [id].tsx             # aceitar/rejeitar transferência
  src/
    api/                   # cliente HTTP com refresh + endpoints
    components/            # UI compartilhada (Button, Card, Chip, etc.)
    context/               # AuthContext, SessionContext, SyncContext
    db/                    # schema SQLite + repositórios + fila
    sync/                  # processador da fila (netinfo + processQueue)
    utils/                 # helpers (uuid, formatação)
    config.ts              # URL base da API (persistida)
    theme.ts               # paleta (branco + azul claro #3B82F6)
  app.json                 # Expo config (câmera, permissões, tema branco)
  babel.config.js
  metro.config.js          # suporte a npm workspaces
  package.json
  tsconfig.json
```

## Requisitos

- Node.js ≥ 18
- npm (o monorepo já usa `npm@11`)
- Expo Go no dispositivo **ou** um emulador Android/iOS

## Instalação

Na raiz do monorepo:

```bash
npm install
```

Como o app está no workspace `apps/posto`, o `npm install` já resolve as
dependências. Se preferir instalar só o subpacote:

```bash
npm install --workspace=posto
```

## Configuração da API

Copie `.env.example` para `.env` (dentro de `apps/posto/`) e ajuste:

```
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000
```

- Emulador Android (AVD): `http://10.0.2.2:4000`
- iOS Simulator: `http://127.0.0.1:4000`
- Dispositivo físico: use o IP da máquina de dev (ex.: `http://192.168.0.20:4000`)

A URL também pode ser trocada em tempo de execução em **Config → API → URL base**.

## Rodar em desenvolvimento

```bash
# a partir de apps/posto/
npx expo start

# ou, a partir da raiz do monorepo
npm run dev:posto
```

Abra o QR code no Expo Go (Android) ou pressione `a` (Android) / `i` (iOS) para
lançar num emulador.

### Notas por plataforma

- **Câmera**: `expo-camera` só funciona em dispositivos/emuladores nativos. No
  navegador (Expo Web) a tela de scan mostra o modo "Informar tag manualmente"
  e o botão **Simular QR**, que escolhe uma máquina sincronizada.
- **SQLite**: também funciona no web via `wa-sqlite`, mas o alvo primário é
  Android/iOS.
- **Permissão de câmera**: ao rodar em produção Android é necessário aceitar o
  prompt exibido na primeira vez em que a tela de scan é aberta.

## Fluxo de trabalho

1. **Login** — email + senha de um usuário com a permissão
   `fuel_station.operate` (ver usuário demo abaixo). Tokens JWT são gravados
   no `SecureStore`.
2. **Bootstrap** — chama `GET /fuel-station/bootstrap` e persiste em SQLite:
   pontos, produtos, estoques, máquinas e transferências pendentes. Ao final,
   seleciona o **ponto de trabalho** e navega para o Dashboard.
3. **Abastecer** — Dashboard → **Abastecer** → scan do QR (tag/id do ERP da
   máquina, ou manual/simular) → tela de confirmação → salvamento local
   **imediato**: insere na tabela `dispensings_local`, decrementa
   `stocks.quantity_liters`, atualiza `machinery.hour_meter` /
   `machinery.odometer_km` e enfileira a operação em `sync_queue`
   (kind = `dispensing`) com o corpo exato de `CreateDispensingDto`. Se
   estiver online, dispara o envio imediatamente; caso contrário, a fila é
   processada assim que a conexão voltar (via `@react-native-community/netinfo`).
4. **Transferências** — pedidos ficam em `sync_queue` (`transfer_request`); as
   ações de aceitar/rejeitar também são enfileiradas (`transfer_accept`/
   `transfer_reject`) e o estoque local é ajustado de forma otimista. O aceite
   real na API sempre credita o valor integral da transferência — não há
   aceite parcial.
5. **Fila** — tela dedicada mostra pendentes, em envio, com erro e concluídos.
   Botões: **Forçar sincronização** (reseta erros para `pending` e chama o
   processador) e **Limpar concluídos**.

## Usuário demo

Criado pelo seed (`apps/api/prisma/seed.ts`) especificamente para este app:

- **Email**: `operador@local.dev`
- **Senha**: `Operador123!`
- Permissões: `fuel_station.operate` + `fuel_station.transfers`, liberado nos
  pontos "Posto Sede" e "Comboio 01".

## API real (apps/api/src/fuel-station)

- `POST /auth/login` — `{ email, password }` → `{ accessToken, refreshToken, user }`
- `POST /auth/refresh` — `{ refreshToken }` → `{ accessToken, refreshToken, ... }`
- `GET /auth/me` — retorna `{ id, email, name, active, isAdmin, permissions[], profiles[], dashboards[] }`
- `GET /fuel-station/bootstrap` — retorna (ver `BootstrapService.build`):
  ```jsonc
  {
    "user": { "id": "..." },
    "points":    [ { "id": "...", "name": "...", "type": "POSTO" | "COMBOIO", "maxCapacityLiters": 20000, "active": true, "validatedAt": "..." } ],
    "products":  [ { "id": "...", "name": "Diesel S10", "unit": "L", "active": true } ],
    "stocks":    [ { "id": "...", "pointId": "...", "productId": "...", "quantityLiters": 8000, "minReserveLiters": 1000, "product": { "id": "...", "name": "...", "unit": "L" } } ],
    "machinery": [ { "id": "...", "tag": "TRAT-042", "name": "Trator ...", "category": "Trator", "status": "ATIVO", "hourMeter": 1200.5, "odometerKm": 0, "defaultProductId": "...", "erpExternalId": "..." } ],
    "pendingTransfers": [ { "id": "...", "originPointId": "...", "destPointId": "...", "productId": "...", "liters": 500, "status": "PENDENTE", "createdAt": "2026-..." } ]
  }
  ```
  Não existem os campos `code`/`location` (ponto), `fuelType`/`capacity`/`reserved`
  (estoque) ou `km`/`qrCode` (máquina) que uma versão anterior deste app
  assumia — o QR/leitura manual casa por `tag` ou `erpExternalId`.
- `POST /fuel-station/dispensings` — corpo **exato** de `CreateDispensingDto`
  (o `ValidationPipe` da API usa `whitelist + forbidNonWhitelisted`, então
  qualquer campo extra derruba a request com 400):
  ```jsonc
  {
    "machineryId": "...",
    "pointId": "...",
    "productId": "...",
    "liters": 42.5,
    "hourMeterReported": 1201.2,
    "kmReported": null,
    "offlineClientId": "uuid"
  }
  ```
  O servidor é idempotente por `offlineClientId` (reenvios retornam o registro
  já persistido).
- `POST /fuel-station/transfers` — corpo exato de `CreateTransferDto`:
  `{ originPointId, destPointId, productId, liters, observation? }`. Não tem
  `offlineClientId` — a dedupe de reenvio de solicitação é só local.
- `POST /fuel-station/transfers/:id/accept` — **sem corpo**; credita sempre o
  valor total de `liters` no ponto de destino.
- `POST /fuel-station/transfers/:id/reject` — corpo `{ reason? }`.

## ERP Compass

O status de integração com o Compass é **mockado como “ativo”** no Dashboard.
A integração real está fora do escopo deste app.

## Tema

- Fundo branco (`#FFFFFF`)
- Primária azul claro (`#3B82F6`)
- Cards com bordas retas (raio ~8px), sem gradientes
- Ícones lineares Ionicons (`@expo/vector-icons`)

## Build Android (EAS)

O app já vem configurado para o serviço [EAS Build](https://expo.dev/eas)
(perfil `preview` gera um APK sideloadável; `production` gera AAB para a Play
Store). Os arquivos `eas.json`, `app.json` (com `owner`, `android.package`,
`android.versionCode` e `extra.eas.projectId`) já estão no repositório.

### Perfis definidos em `eas.json`

| Perfil | Distribuição | Artefato Android | `EXPO_PUBLIC_API_URL` |
|--------|--------------|------------------|-----------------------|
| `development` | interna (Dev Client) | APK | `https://grupofranciosi.agrigestao.tech` |
| `preview`     | interna (sideload)   | APK release       | `https://grupofranciosi.agrigestao.tech` |
| `production`  | store                | AAB (`versionCode` auto) | `https://grupofranciosi.agrigestao.tech` |

Para apontar para outra API, sobrescreva `EXPO_PUBLIC_API_URL` na hora do
build (`--env EXPO_PUBLIC_API_URL=...`) ou edite o campo `env` do perfil em
`eas.json`. O operador também pode trocar em runtime em **Config → API →
URL base**.

### Pré-requisitos

- Conta [Expo](https://expo.dev/) com acesso à organização/owner definida em
  `app.json` (`owner: "suporte.ti.oilema"`). Ajuste `owner` se preferir outra
  conta/team.
- `eas-cli` (não precisa instalar globalmente; `npx eas-cli ...` funciona).
- Autenticação: `eas login` (interativo) **ou** exportar `EXPO_TOKEN`
  (recomendado em CI, [gerar aqui](https://expo.dev/settings/access-tokens)):

  ```bash
  # PowerShell
  $env:EXPO_TOKEN = "seu_token"

  # bash / zsh
  export EXPO_TOKEN=seu_token
  ```

### Gerar APK (perfil `preview`, para sideload)

Todos os comandos rodam **de dentro** de `apps/posto/`:

```bash
cd apps/posto

# (uma única vez) linka o projeto ao serviço EAS – já foi feito no repo:
# npx eas-cli init --non-interactive --force

# dispara o build na nuvem
npx eas-cli build -p android --profile preview --non-interactive
```

Ao final, o EAS imprime uma URL do tipo
`https://expo.dev/accounts/suporte.ti.oilema/projects/posto/builds/<id>` —
abra a página do build e clique em **Install** (QR code) ou baixe o `.apk`
diretamente. Para acompanhar builds em andamento:

```bash
npx eas-cli build:list --platform android --limit 5
```

### Gerar bundle de produção (Play Store)

```bash
npx eas-cli build -p android --profile production
# depois:
npx eas-cli submit -p android --latest
```

O perfil `production` incrementa o `versionCode` automaticamente
(`autoIncrement: true`) e produz um `.aab`.

### Credenciais Android

Na primeira vez que rodar `eas build -p android`, o EAS pergunta se você
quer que ele gere e guarde o keystore de assinatura no servidor (recomendado
para builds internos). Reutilize sempre o mesmo keystore — trocar significa
que atualizações do APK não instalam por cima de versões anteriores.

## Roadmap curto

- Detalhe de máquina (histórico de abastecimentos por tag).
- Notificações locais quando uma carga chega no ponto do operador.
- Login por PIN de operador (segundo fator do turno).


## Build local do APK (Windows / sem EAS cloud)

Quando o build EAS na nuvem estiver fora ou for necessario um APK sideloadable
imediato, e possivel gerar o `.apk` localmente na maquina Windows (sem Docker).

### Pre-requisitos

- **JDK 17** (Microsoft Build of OpenJDK ou Temurin). `java -version` precisa retornar 17.x.
- **Android SDK** com `platforms;android-35`, `build-tools;35.0.0` e NDK `26.1.10909125`
  (o `sdkmanager` do Android Studio instala tudo isso). Defina
  `ANDROID_HOME` / `ANDROID_SDK_ROOT` apontando para a pasta do SDK.
- Node 20+.
- Dependencias do monorepo instaladas (`npm install` na raiz).

### Passo a passo

```powershell
cd d:\PROJETOS\grupo_franciosi\apps\posto

# 1. Gera a pasta android/ nativa (Expo prebuild)
$env:EXPO_PUBLIC_API_URL="https://grupofranciosi.agrigestao.tech"
$env:CI="1"
npx expo prebuild --platform android --clean --no-install

# 2. Compila release APK (arm64 + arm) - assinatura debug (sideload).
#    EXPO_NO_METRO_WORKSPACE_ROOT resolve o "Unable to resolve module"
#    de Metro em monorepo npm workspaces.
cd android
$env:EXPO_PUBLIC_API_URL="https://grupofranciosi.agrigestao.tech"
$env:NODE_ENV="production"
$env:EXPO_NO_METRO_WORKSPACE_ROOT="1"
$env:GRADLE_OPTS="-Xmx4g -Dfile.encoding=UTF-8"
.\gradlew.bat :app:assembleRelease --no-daemon --no-parallel

# 3. O APK final fica em:
#    apps/posto/android/app/build/outputs/apk/release/app-release.apk
# Copia opcional para dist/:
Copy-Item .\app\build\outputs\apk\release\app-release.apk ..\dist\posto-preview.apk -Force
```

### Notas importantes

- **`main` = `index.js` + arquivo `apps/posto/index.js`**: e um shim para o
  entry do `expo-router`. Sem ele, o Metro tenta resolver
  `expo-router/entry` a partir da raiz do monorepo e falha.
- **`EXPO_NO_METRO_WORKSPACE_ROOT=1`**: obrigatorio no build local Windows
  para que o Metro use `apps/posto` (nao a raiz `grupo_franciosi`) como
  serverRoot ao resolver o entry file passado pelo RN Gradle plugin.
- **Kotlin 1.9.25**: o `expo-modules-core@2.2.x` usa Compose Compiler 1.5.15,
  que exige Kotlin >= 1.9.25 (o RN Gradle plugin pinna 1.9.24 por padrao).
  O `android/build.gradle` gerado ja for a essa versao no classpath.
- **`reactNativeArchitectures=arm64-v8a,armeabi-v7a`** (em
  `android/gradle.properties`): builda so ABIs de dispositivos reais. Isso
  encurta o build de ~30 min para ~4 min e evita conflito de lock de
  arquivo do CMake x86 no Windows.
- **`splashscreen_logo`**: como `app.json` nao define uma imagem de splash,
  criamos um vector drawable placeholder em
  `android/app/src/main/res/drawable/splashscreen_logo.xml`. Se voce refizer
  `expo prebuild --clean`, o arquivo precisa ser recriado (ou defina uma
  imagem real em `assets/` e reference no `app.json`).
- **`@expo/vector-icons` fixado em `14.0.4`**: versoes 14.1+ puxam
  `expo-font@57` (SDK 55) que quebra o build do SDK 52.
- Assinatura: o APK e assinado com o keystore de debug (`android/app/debug.keystore`).
  Isso e suficiente para instalar via `adb install` ou distribuir por link
  interno. **Nao serve para publicar na Play Store** - para isso use
  `npx eas-cli build -p android --profile production`.

### Instalar no dispositivo

```powershell
adb install -r apps\posto\dist\posto-preview.apk
```