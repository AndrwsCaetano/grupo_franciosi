import 'dotenv/config';
import * as bcrypt from 'bcrypt';
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

async function main() {
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

  const passwordHash = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@local.dev' },
    create: {
      email: 'admin@local.dev',
      name: 'Administrador',
      passwordHash,
      isAdmin: true,
      profiles: {
        create: { profileId: adminProfile.id },
      },
    },
    update: { passwordHash, active: true, isAdmin: true },
  });

  if (
    (await prisma.userProfile.count({
      where: { userId: admin.id, profileId: adminProfile.id },
    })) === 0
  ) {
    await prisma.userProfile.create({
      data: { userId: admin.id, profileId: adminProfile.id },
    });
  }

  const ds = await prisma.dataSource.upsert({
    where: { id: 'seed-local-placeholder' },
    create: {
      id: 'seed-local-placeholder',
      name: 'Exemplo (substituir)',
      type: 'POSTGRES',
      host: 'localhost',
      port: 5434,
      databaseName: 'grupo_franciosi',
      username: 'postgres',
      passwordEnc: 'CONFIGURE_EM_PRODUCAO',
      ssl: false,
    },
    update: { port: 5434, host: 'localhost' },
  });

  await prisma.dashboard.upsert({
    where: { slug: 'exemplo-resumo' },
    create: {
      name: 'Exemplo — resumo',
      slug: 'exemplo-resumo',
      description: 'Dashboard de demonstração; substitua a query em `definition`.',
      definition: {
        version: 1,
        query: 'SELECT count(*)::int AS total FROM "User" WHERE active = true',
        viz: { type: 'scalar', label: 'Usuários ativos' },
      },
      dataSourceId: ds.id,
      active: true,
    },
    update: {},
  });

  const dash = await prisma.dashboard.findUniqueOrThrow({
    where: { slug: 'exemplo-resumo' },
  });
  await prisma.userDashboard.upsert({
    where: {
      userId_dashboardId: { userId: admin.id, dashboardId: dash.id },
    },
    create: { userId: admin.id, dashboardId: dash.id },
    update: {},
  });

  console.log('Seed OK — login: admin@local.dev / Admin123!');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
