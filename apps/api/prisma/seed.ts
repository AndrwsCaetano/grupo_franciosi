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

  // =====================================================================
  // Módulo Posto de Combustível — dados de demonstração idempotentes.
  // =====================================================================
  const products = [
    { name: 'Diesel S10', unit: 'L' },
    { name: 'Diesel S500', unit: 'L' },
    { name: 'Arla 32', unit: 'L' },
  ];
  const productByName: Record<string, string> = {};
  for (const p of products) {
    const created = await prisma.fuelProduct.upsert({
      where: { name: p.name },
      create: { name: p.name, unit: p.unit, active: true },
      update: { active: true, unit: p.unit },
    });
    productByName[p.name] = created.id;
  }

  const points: Array<{
    name: string;
    type: 'POSTO' | 'COMBOIO';
    maxCapacityLiters: number;
  }> = [
    { name: 'Posto Sede', type: 'POSTO', maxCapacityLiters: 30000 },
    { name: 'Posto Fazenda Norte', type: 'POSTO', maxCapacityLiters: 20000 },
    { name: 'Posto Fazenda Sul', type: 'POSTO', maxCapacityLiters: 20000 },
    { name: 'Posto Oficina', type: 'POSTO', maxCapacityLiters: 15000 },
    { name: 'Comboio 01', type: 'COMBOIO', maxCapacityLiters: 8000 },
    { name: 'Comboio 02', type: 'COMBOIO', maxCapacityLiters: 8000 },
  ];
  const pointByName: Record<string, string> = {};
  for (const pt of points) {
    const created = await prisma.fuelPoint.upsert({
      where: { name: pt.name },
      create: {
        name: pt.name,
        type: pt.type,
        maxCapacityLiters: pt.maxCapacityLiters,
        active: true,
        validatedAt: new Date(),
      },
      update: {
        type: pt.type,
        maxCapacityLiters: pt.maxCapacityLiters,
        active: true,
        validatedAt: new Date(),
      },
    });
    pointByName[pt.name] = created.id;
  }

  // Estoque inicial por ponto x produto (idempotente por chave composta).
  const initialStocks: Array<{
    point: string;
    product: string;
    qty: number;
    min: number;
  }> = [
    { point: 'Posto Sede', product: 'Diesel S10', qty: 18000, min: 2000 },
    { point: 'Posto Sede', product: 'Diesel S500', qty: 6000, min: 1000 },
    { point: 'Posto Sede', product: 'Arla 32', qty: 500, min: 100 },
    { point: 'Posto Fazenda Norte', product: 'Diesel S10', qty: 9000, min: 1500 },
    { point: 'Posto Fazenda Sul', product: 'Diesel S10', qty: 8000, min: 1500 },
    { point: 'Posto Oficina', product: 'Diesel S500', qty: 3000, min: 500 },
    { point: 'Comboio 01', product: 'Diesel S10', qty: 4000, min: 500 },
    { point: 'Comboio 02', product: 'Diesel S10', qty: 3500, min: 500 },
  ];
  for (const s of initialStocks) {
    const pointId = pointByName[s.point];
    const productId = productByName[s.product];
    await prisma.fuelStock.upsert({
      where: { pointId_productId: { pointId, productId } },
      create: {
        pointId,
        productId,
        quantityLiters: s.qty,
        minReserveLiters: s.min,
      },
      update: {
        minReserveLiters: s.min,
      },
    });
  }

  const machineries: Array<{
    tag: string;
    name: string;
    category: string;
    defaultProduct?: string;
    hourMeter: number;
    odometerKm: number;
  }> = [
    {
      tag: 'TR-001',
      name: 'Trator John Deere 6110J',
      category: 'Trator',
      defaultProduct: 'Diesel S10',
      hourMeter: 1240,
      odometerKm: 0,
    },
    {
      tag: 'TR-002',
      name: 'Trator Massey Ferguson 4275',
      category: 'Trator',
      defaultProduct: 'Diesel S10',
      hourMeter: 980,
      odometerKm: 0,
    },
    {
      tag: 'CO-001',
      name: 'Colheitadeira Case IH 5130',
      category: 'Colheitadeira',
      defaultProduct: 'Diesel S10',
      hourMeter: 640,
      odometerKm: 0,
    },
    {
      tag: 'CA-001',
      name: 'Caminhão Volvo FH 460',
      category: 'Caminhão',
      defaultProduct: 'Diesel S10',
      hourMeter: 0,
      odometerKm: 180500,
    },
    {
      tag: 'CA-002',
      name: 'Caminhão Scania R 450',
      category: 'Caminhão',
      defaultProduct: 'Diesel S10',
      hourMeter: 0,
      odometerKm: 95400,
    },
  ];
  for (const m of machineries) {
    await prisma.machinery.upsert({
      where: { tag: m.tag },
      create: {
        tag: m.tag,
        name: m.name,
        category: m.category,
        defaultProductId: m.defaultProduct
          ? productByName[m.defaultProduct]
          : null,
        hourMeter: m.hourMeter,
        odometerKm: m.odometerKm,
        status: 'ATIVO',
        validatedAt: new Date(),
      },
      update: {
        name: m.name,
        category: m.category,
        defaultProductId: m.defaultProduct
          ? productByName[m.defaultProduct]
          : null,
        validatedAt: new Date(),
      },
    });
  }

  // Usuário demo "operador@local.dev": representa o operador de posto que usa
  // o app de apontamento. Criado (idempotente) com override direto das
  // permissões fuel_station.operate/fuel_station.transfers (sem perfil
  // Administrador) e liberado nos pontos "Posto Sede" e "Comboio 01".
  const operatorPasswordHash = await bcrypt.hash('Operador123!', 10);
  const operator = await prisma.user.upsert({
    where: { email: 'operador@local.dev' },
    create: {
      email: 'operador@local.dev',
      name: 'Operador Demo',
      passwordHash: operatorPasswordHash,
      isAdmin: false,
      active: true,
    },
    update: { active: true },
  });

  const operatorPermCodes = ['fuel_station.operate', 'fuel_station.transfers'];
  const operatorPerms = await prisma.permission.findMany({
    where: { code: { in: operatorPermCodes } },
  });
  for (const perm of operatorPerms) {
    await prisma.userPermission.upsert({
      where: {
        userId_permissionId: { userId: operator.id, permissionId: perm.id },
      },
      create: { userId: operator.id, permissionId: perm.id, granted: true },
      update: { granted: true },
    });
  }

  for (const name of ['Posto Sede', 'Comboio 01']) {
    const pointId = pointByName[name];
    if (!pointId) continue;
    await prisma.userFuelPointAccess.upsert({
      where: { userId_pointId: { userId: operator.id, pointId } },
      create: { userId: operator.id, pointId },
      update: {},
    });
  }

  console.log(
    'Seed OK — login admin: admin@local.dev / Admin123! · operador: operador@local.dev / Operador123!',
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
