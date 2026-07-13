import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { DEFAULT_PERMISSIONS } from '@grupo-franciosi/shared';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL ausente');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(databaseUrl),
});

/**
 * Fallback local com as opções mais recentes do catálogo.
 *
 * Objetivo: mesmo que o build do pacote `@grupo-franciosi/shared` esteja
 * defasado dentro da imagem (cache de camadas do Docker, build parcial em
 * dev, workspace symlink apontando para dist antigo, etc.), estas opções
 * *sempre* entram na tabela `Permission`. Assim o admin consegue liberar o
 * módulo Posto de Combustível na tela de "Perfis" sem depender apenas do
 * rebuild do shared.
 *
 * Quando adicionar uma opção nova em `packages/shared/src/permissions.ts`,
 * copie a linha correspondente aqui até o próximo release estabilizar.
 * Duplicidades são resolvidas pelo `dedupe` (preferindo o shared).
 */
const FALLBACK_PERMISSIONS: ReadonlyArray<{ code: string; name: string }> = [
  // Posto de Combustível — módulo introduzido em jul/2026.
  { code: 'fuel_station.read', name: 'Posto de Combustível: consultar dados' },
  {
    code: 'fuel_station.write',
    name: 'Posto de Combustível: administrar cadastros',
  },
  {
    code: 'fuel_station.operate',
    name: 'Posto de Combustível: apontar abastecimentos',
  },
  {
    code: 'fuel_station.validate',
    name: 'Posto de Combustível: validar imports do ERP',
  },
  {
    code: 'fuel_station.transfers',
    name: 'Posto de Combustível: solicitar/aceitar transferências',
  },
];

function dedupeByCode(
  items: ReadonlyArray<{ code: string; name: string }>,
): Array<{ code: string; name: string }> {
  const byCode = new Map<string, { code: string; name: string }>();
  for (const it of items) {
    byCode.set(it.code, { code: it.code, name: it.name });
  }
  return Array.from(byCode.values());
}

/**
 * Upserta opções do catálogo shared (+ fallback) e garante grants no perfil
 * Administrador. Segura para rodar múltiplas vezes; nunca remove opções
 * (permissões deprecadas continuam no DB até serem removidas manualmente).
 */
export async function syncPermissions() {
  // shared vem primeiro; fallback preenche o que faltar (fuel_station.*).
  const desired = dedupeByCode([
    ...DEFAULT_PERMISSIONS,
    ...FALLBACK_PERMISSIONS,
  ]);

  const sharedCodes = new Set<string>(DEFAULT_PERMISSIONS.map((p) => p.code));
  const fallbackOnly = FALLBACK_PERMISSIONS.filter(
    (p) => !sharedCodes.has(p.code),
  );
  if (fallbackOnly.length > 0) {
    console.warn(
      `[sync-permissions] AVISO: shared não tem ${fallbackOnly.length} opção(ões) esperada(s); usando fallback local: ${fallbackOnly
        .map((p) => p.code)
        .join(', ')}. Reconstrua o pacote @grupo-franciosi/shared.`,
    );
  }

  for (const p of desired) {
    await prisma.permission.upsert({
      where: { code: p.code },
      create: { code: p.code, name: p.name },
      update: { name: p.name },
    });
  }

  const allPerms = await prisma.permission.findMany();
  const byCode = Object.fromEntries(allPerms.map((x) => [x.code, x.id]));

  const adminProfile = await prisma.profile.upsert({
    where: { name: 'Administrador' },
    create: { name: 'Administrador', description: 'Acesso total ao painel' },
    update: {},
  });

  for (const p of desired) {
    await prisma.profilePermission.upsert({
      where: {
        profileId_permissionId: {
          profileId: adminProfile.id,
          permissionId: byCode[p.code],
        },
      },
      create: {
        profileId: adminProfile.id,
        permissionId: byCode[p.code],
        granted: true,
      },
      update: { granted: true },
    });
  }

  // Sanity-check pós-sync: relatório do que ficou no DB, com destaque para
  // as opções `fuel_station.*` (que foram o motivo desta rotina existir).
  const finalPerms = await prisma.permission.findMany({
    orderBy: { code: 'asc' },
    select: { code: true },
  });
  const finalCodes = finalPerms.map((p) => p.code);
  const fuelStationCodes = finalCodes.filter((c) =>
    c.startsWith('fuel_station.'),
  );
  const missing = desired
    .map((p) => p.code)
    .filter((c) => !finalCodes.includes(c));

  console.log(
    `[sync-permissions] catálogo esperado: ${desired.length} (shared=${DEFAULT_PERMISSIONS.length}, fallback-only=${fallbackOnly.length})`,
  );
  console.log(
    `[sync-permissions] persistidas no DB: ${finalCodes.length} · fuel_station.*: ${fuelStationCodes.length}`,
  );
  if (fuelStationCodes.length > 0) {
    console.log(
      `[sync-permissions] fuel_station codes no DB: ${fuelStationCodes.join(', ')}`,
    );
  }
  if (missing.length > 0) {
    console.error(
      `[sync-permissions] ERRO: ${missing.length} opção(ões) esperada(s) não foram encontradas no DB após upsert: ${missing.join(', ')}`,
    );
    throw new Error(
      `sync-permissions inconsistente: faltam ${missing.length} opções no DB`,
    );
  }
}

async function main() {
  await syncPermissions();
}

if (require.main === module) {
  main()
    .then(() => prisma.$disconnect())
    .catch((e) => {
      console.error('[sync-permissions] falhou:', e);
      prisma.$disconnect();
      process.exit(1);
    });
}
