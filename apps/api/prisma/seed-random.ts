import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL ausente');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(databaseUrl),
});

const VEHICLES_TO_CREATE = 10;
const DRIVERS_TO_CREATE = 12;
const FUELINGS_TO_CREATE = 40;

const TRUCK_BRANDS_MODELS: Array<{ brand: string; models: string[] }> = [
  { brand: 'Volvo', models: ['FH 540', 'FH 460', 'FM 370', 'VM 270'] },
  { brand: 'Scania', models: ['R 450', 'R 540', 'P 320', 'G 410'] },
  { brand: 'Mercedes-Benz', models: ['Actros 2651', 'Axor 2544', 'Atego 2426'] },
  { brand: 'Iveco', models: ['Stralis 600S48T', 'Hi-Way 480', 'Tector 240E28'] },
  { brand: 'Volkswagen', models: ['Constellation 24.280', 'Meteor 28.460', 'Delivery 11.180'] },
  { brand: 'MAN', models: ['TGX 28.480', 'TGS 26.480'] },
  { brand: 'DAF', models: ['XF 480', 'CF 410'] },
  { brand: 'Ford', models: ['Cargo 2429', 'Cargo 1119'] },
];

const FIRST_NAMES = [
  'Carlos', 'Pedro', 'João', 'Antônio', 'Marcos', 'Lucas', 'Rafael', 'Bruno',
  'Tiago', 'Felipe', 'Eduardo', 'Roberto', 'Ricardo', 'Anderson', 'Fernando',
  'Gabriel', 'Mateus', 'Vinicius', 'Leandro', 'Fabio', 'Paulo', 'Júlio',
  'Sérgio', 'Marcelo', 'André', 'Rodrigo',
];
const LAST_NAMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Almeida',
  'Pereira', 'Lima', 'Gomes', 'Ribeiro', 'Carvalho', 'Martins', 'Araújo',
  'Barbosa', 'Cardoso', 'Teixeira', 'Moreira', 'Cavalcanti', 'Dias', 'Castro',
  'Fonseca', 'Vieira', 'Pinto', 'Nunes',
];

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

function randomMercosulPlate(): string {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const N = '0123456789';
  return (
    pick(A.split('')) +
    pick(A.split('')) +
    pick(A.split('')) +
    pick(N.split('')) +
    pick(A.split('')) +
    pick(N.split('')) +
    pick(N.split(''))
  );
}

function generateCpf(): string {
  const digits: number[] = [];
  for (let i = 0; i < 9; i += 1) {
    digits.push(randInt(0, 9));
  }
  const dv = (slice: number[]) => {
    let sum = 0;
    for (let i = 0; i < slice.length; i += 1) {
      sum += slice[i] * (slice.length + 1 - i);
    }
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };
  digits.push(dv(digits));
  digits.push(dv(digits));
  return digits.join('');
}

function dateOnlyUTC(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function randomDateBetween(startInclusive: Date, endInclusive: Date): Date {
  const start = startInclusive.getTime();
  const end = endInclusive.getTime();
  return new Date(start + Math.random() * (end - start));
}

function randomFullName(): string {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)} ${pick(LAST_NAMES)}`;
}

function randomLicenseNumber(): string {
  let s = '';
  for (let i = 0; i < 11; i += 1) {
    s += String(randInt(0, 9));
  }
  return s;
}

async function ensureUniquePlate(): Promise<string> {
  for (let i = 0; i < 50; i += 1) {
    const candidate = randomMercosulPlate();
    const exists = await prisma.vehicle.findUnique({
      where: { plate: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }
  throw new Error('Não consegui gerar placa única após 50 tentativas');
}

async function ensureUniqueCpf(): Promise<string> {
  for (let i = 0; i < 50; i += 1) {
    const candidate = generateCpf();
    const exists = await prisma.driver.findUnique({
      where: { cpf: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }
  throw new Error('Não consegui gerar CPF único após 50 tentativas');
}

async function main() {
  // ---------- Veículos ----------
  console.log(`Criando ${VEHICLES_TO_CREATE} veículos...`);
  const createdVehicles: { id: string; plate: string }[] = [];
  for (let i = 0; i < VEHICLES_TO_CREATE; i += 1) {
    const brandModel = pick(TRUCK_BRANDS_MODELS);
    const v = await prisma.vehicle.create({
      data: {
        plate: await ensureUniquePlate(),
        brand: brandModel.brand,
        model: pick(brandModel.models),
        fuelTankLiters: randInt(200, 800),
        active: Math.random() > 0.1, // 90% ativos
      },
      select: { id: true, plate: true },
    });
    createdVehicles.push(v);
  }

  // ---------- Motoristas ----------
  console.log(`Criando ${DRIVERS_TO_CREATE} motoristas...`);
  const createdDrivers: { id: string; name: string }[] = [];
  const today = new Date();
  for (let i = 0; i < DRIVERS_TO_CREATE; i += 1) {
    const birth = dateOnlyUTC(
      randomDateBetween(new Date('1960-01-01'), new Date('2002-12-31')),
    );
    const issue = dateOnlyUTC(
      randomDateBetween(new Date('2018-01-01'), new Date('2024-12-31')),
    );
    const expiry = dateOnlyUTC(
      new Date(
        Date.UTC(
          issue.getUTCFullYear() + randInt(5, 10),
          issue.getUTCMonth(),
          issue.getUTCDate(),
        ),
      ),
    );
    const d = await prisma.driver.create({
      data: {
        name: randomFullName().toUpperCase(),
        cpf: await ensureUniqueCpf(),
        birthDate: birth,
        licenseNumber: randomLicenseNumber(),
        licenseIssueDate: issue,
        licenseExpiryDate: expiry,
        active: true,
      },
      select: { id: true, name: true },
    });
    createdDrivers.push(d);
  }

  // ---------- Lançador (admin) ----------
  const admin = await prisma.user.findFirst({
    where: { email: 'admin@local.dev' },
    select: { id: true },
  });
  if (!admin) {
    throw new Error('Usuário admin@local.dev não encontrado. Rode `npx prisma db seed` antes.');
  }

  // ---------- Abastecimentos ----------
  console.log(`Criando ${FUELINGS_TO_CREATE} abastecimentos...`);
  const allDrivers = await prisma.driver.findMany({
    select: { id: true, name: true },
  });
  const allActiveVehicles = await prisma.vehicle.findMany({
    where: { active: true },
    select: { id: true, plate: true },
  });

  const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
  const noteSamples = [
    null,
    null,
    null,
    'Diesel S10',
    'Posto BR — Marília',
    'Abastecimento parcial',
    'Tanque cheio',
    'Posto Shell — rodovia',
  ];

  for (let i = 0; i < FUELINGS_TO_CREATE; i += 1) {
    const driver = pick(allDrivers);
    const vehicle = pick(allActiveVehicles);
    const fuelDate = dateOnlyUTC(randomDateBetween(ninetyDaysAgo, today));
    await prisma.vehicleFueling.create({
      data: {
        driverId: driver.id,
        vehicleId: vehicle.id,
        driverNameSnapshot: driver.name,
        fuelDate,
        quantityLiters: Number((randInt(5000, 60000) / 100).toFixed(2)),
        notes: pick(noteSamples),
        createdById: admin.id,
      },
    });
  }

  // ---------- Resumo ----------
  const totals = await prisma.$transaction([
    prisma.vehicle.count(),
    prisma.driver.count(),
    prisma.vehicleFueling.count(),
  ]);
  console.log('---');
  console.log(`Total veículos:       ${totals[0]}`);
  console.log(`Total motoristas:     ${totals[1]}`);
  console.log(`Total abastecimentos: ${totals[2]}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
