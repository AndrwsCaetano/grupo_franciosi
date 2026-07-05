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

/** Upserta opções do catálogo shared e garante grants no perfil Administrador. */
export async function syncPermissions() {
  for (const p of DEFAULT_PERMISSIONS) {
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

  for (const p of DEFAULT_PERMISSIONS) {
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
}

async function main() {
  await syncPermissions();
  console.log(
    `Permissões sincronizadas (${DEFAULT_PERMISSIONS.length} opções).`,
  );
}

if (require.main === module) {
  main()
    .then(() => prisma.$disconnect())
    .catch((e) => {
      console.error(e);
      prisma.$disconnect();
      process.exit(1);
    });
}
