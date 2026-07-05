import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { syncPermissions } from './sync-permissions';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL ausente');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(databaseUrl),
});

async function main() {
  await syncPermissions();

  const adminProfile = await prisma.profile.findUniqueOrThrow({
    where: { name: 'Administrador' },
  });

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

  // Conexão Oracle fixa usada pelo módulo de Relatórios (UNISYSTEM).
  // Em produção, configure host/usuário/senha/serviço em "Conexões".
  // update vazio para preservar o que o admin editar pelo painel.
  await prisma.dataSource.upsert({
    where: { id: 'oracle-unisystem' },
    create: {
      id: 'oracle-unisystem',
      name: 'Oracle UNISYSTEM (Relatórios)',
      type: 'ORACLE',
      host: 'CONFIGURE_EM_PRODUCAO',
      port: 1521,
      databaseName: 'CONFIGURE_SERVICE_NAME',
      username: 'CONFIGURE_USUARIO',
      passwordEnc: 'CONFIGURE_EM_PRODUCAO',
      ssl: false,
      active: true,
      // schema: owner das tabelas do UNISYSTEM (aplica ALTER SESSION SET CURRENT_SCHEMA).
      extra: { schema: 'AGNEW' },
    },
    update: {},
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
