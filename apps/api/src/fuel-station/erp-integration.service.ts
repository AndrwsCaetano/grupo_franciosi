import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FuelStationService } from './fuel-station.service';

/**
 * Serviço de integração com o ERP Compass. Enquanto a API definitiva não
 * está publicada, todas as chamadas são simuladas: `pull` devolve payloads
 * fictícios, `push` apenas registra em `FuelSyncLog` como SUCESSO.
 *
 * TODO: substituir por chamada real à API do Compass
 * (autenticação, retry, mapeamento de campos etc).
 */
@Injectable()
export class ErpIntegrationService {
  constructor(
    private prisma: PrismaService,
    private fuelStation: FuelStationService,
  ) {}

  /**
   * Puxa registros do ERP (mock) e enfileira em FuelErpImport como PENDENTE
   * para posterior validação humana. Retorna os imports criados.
   */
  async pull(kind?: 'EQUIPAMENTO' | 'NF_ENTRADA') {
    // TODO: substituir por chamada real à API do Compass
    const now = new Date().toISOString();
    const created: unknown[] = [];

    if (!kind || kind === 'EQUIPAMENTO') {
      const payloads = [
        {
          erpExternalId: `ERP-EQ-${Date.now()}-1`,
          tag: 'TR-050',
          name: 'Trator John Deere 6155M (ERP)',
          category: 'Trator',
          defaultProductName: 'Diesel S10',
          hourMeter: 0,
          odometerKm: 0,
        },
        {
          erpExternalId: `ERP-EQ-${Date.now()}-2`,
          tag: 'CA-050',
          name: 'Caminhão MB Actros 2651 (ERP)',
          category: 'Caminhão',
          defaultProductName: 'Diesel S10',
          hourMeter: 0,
          odometerKm: 12000,
        },
      ];
      for (const payload of payloads) {
        const imp = await this.prisma.fuelErpImport.create({
          data: {
            kind: 'EQUIPAMENTO',
            payload: payload as Prisma.InputJsonValue,
            status: 'PENDENTE',
          },
        });
        created.push(imp);
      }
    }

    if (!kind || kind === 'NF_ENTRADA') {
      const payloads = [
        {
          numero: `NF-${Date.now()}-1`,
          emissao: now,
          fornecedor: 'Petrobras Distribuidora',
          productName: 'Diesel S10',
          pointName: 'Posto Sede',
          liters: 5000,
        },
      ];
      for (const payload of payloads) {
        const imp = await this.prisma.fuelErpImport.create({
          data: {
            kind: 'NF_ENTRADA',
            payload: payload as Prisma.InputJsonValue,
            status: 'PENDENTE',
          },
        });
        created.push(imp);
      }
    }

    await this.prisma.fuelSyncLog.create({
      data: {
        tipo: 'ERP',
        referenceId: `pull-${Date.now()}`,
        status: 'SUCESSO',
        attempts: 1,
        lastAttemptAt: new Date(),
        erpResponse: {
          note: 'mock',
          kind: kind ?? 'ALL',
          count: created.length,
        } as Prisma.InputJsonValue,
      },
    });

    return { items: created, total: created.length };
  }

  /**
   * Envia um apontamento ao ERP (mock). Apenas registra sucesso e marca
   * o dispensing como SINCRONIZADO.
   *
   * TODO: substituir por chamada real à API do Compass
   */
  async pushDispensing(dispensingId: string) {
    try {
      await this.prisma.fuelDispensing.update({
        where: { id: dispensingId },
        data: { syncStatus: 'SINCRONIZADO' },
      });
      await this.prisma.fuelSyncLog.create({
        data: {
          tipo: 'APONTAMENTO',
          referenceId: dispensingId,
          status: 'SUCESSO',
          attempts: 1,
          lastAttemptAt: new Date(),
          erpResponse: { mock: true } as Prisma.InputJsonValue,
        },
      });
      return { ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await this.prisma.fuelSyncLog.create({
        data: {
          tipo: 'APONTAMENTO',
          referenceId: dispensingId,
          status: 'ERRO',
          attempts: 1,
          lastAttemptAt: new Date(),
          erpResponse: { error: msg } as Prisma.InputJsonValue,
        },
      });
      return { ok: false, error: msg };
    }
  }

  /**
   * Envia uma transferência ao ERP (mock).
   *
   * TODO: substituir por chamada real à API do Compass
   */
  async pushTransfer(transferId: string) {
    await this.prisma.fuelSyncLog.create({
      data: {
        tipo: 'TRANSFERENCIA',
        referenceId: transferId,
        status: 'SUCESSO',
        attempts: 1,
        lastAttemptAt: new Date(),
        erpResponse: { mock: true } as Prisma.InputJsonValue,
      },
    });
    return { ok: true };
  }

  /**
   * Push genérico chamado do endpoint HTTP.
   */
  async pushGeneric(tipo: 'APONTAMENTO' | 'TRANSFERENCIA', referenceId: string) {
    if (tipo === 'APONTAMENTO') {
      const d = await this.prisma.fuelDispensing.findUnique({
        where: { id: referenceId },
      });
      if (!d) throw new NotFoundException('Apontamento não encontrado');
      return this.pushDispensing(referenceId);
    }
    if (tipo === 'TRANSFERENCIA') {
      const t = await this.prisma.fuelTransfer.findUnique({
        where: { id: referenceId },
      });
      if (!t) throw new NotFoundException('Transferência não encontrada');
      return this.pushTransfer(referenceId);
    }
    throw new BadRequestException('tipo inválido');
  }

  async listImports(kind?: 'EQUIPAMENTO' | 'NF_ENTRADA') {
    const where: Prisma.FuelErpImportWhereInput = {};
    if (kind) where.kind = kind;
    const items = await this.prisma.fuelErpImport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        validatedBy: { select: { id: true, name: true, email: true } },
      },
    });
    return { items, total: items.length };
  }

  /**
   * Aprova/rejeita um import do ERP. Ao aprovar:
   *  - EQUIPAMENTO: upsert em Machinery (por erpExternalId) e valida.
   *  - NF_ENTRADA: cria movimento NF_ENTRADA no ponto informado (ou o do payload).
   */
  async validateImport(
    userId: string,
    id: string,
    action: 'APROVAR' | 'REJEITAR',
    overridePointId?: string,
  ) {
    const imp = await this.prisma.fuelErpImport.findUnique({ where: { id } });
    if (!imp) throw new NotFoundException('Import não encontrado');
    if (imp.status !== 'PENDENTE') {
      throw new BadRequestException(
        `Import já está no status ${imp.status}.`,
      );
    }

    if (action === 'REJEITAR') {
      await this.prisma.fuelErpImport.update({
        where: { id },
        data: {
          status: 'REJEITADO',
          validatedByUserId: userId,
          validatedAt: new Date(),
        },
      });
      return { ok: true };
    }

    const payload = imp.payload as Record<string, unknown>;

    if (imp.kind === 'EQUIPAMENTO') {
      const erpExternalId =
        typeof payload.erpExternalId === 'string' ? payload.erpExternalId : null;
      const tag =
        typeof payload.tag === 'string' ? payload.tag.toUpperCase() : null;
      const name = typeof payload.name === 'string' ? payload.name : null;
      const category =
        typeof payload.category === 'string' ? payload.category : null;
      const defaultProductName =
        typeof payload.defaultProductName === 'string'
          ? payload.defaultProductName
          : null;
      const hourMeter =
        typeof payload.hourMeter === 'number' ? payload.hourMeter : 0;
      const odometerKm =
        typeof payload.odometerKm === 'number' ? payload.odometerKm : 0;

      if (!tag || !name || !category) {
        throw new BadRequestException(
          'Payload de EQUIPAMENTO inválido: tag/name/category obrigatórios.',
        );
      }

      let defaultProductId: string | undefined;
      if (defaultProductName) {
        const p = await this.prisma.fuelProduct.findUnique({
          where: { name: defaultProductName },
        });
        if (p) defaultProductId = p.id;
      }

      await this.prisma.machinery.upsert({
        where: { tag },
        create: {
          tag,
          name,
          category,
          defaultProductId,
          hourMeter,
          odometerKm,
          status: 'ATIVO',
          erpExternalId,
          validatedAt: new Date(),
        },
        update: {
          name,
          category,
          defaultProductId,
          erpExternalId,
          validatedAt: new Date(),
        },
      });
    } else if (imp.kind === 'NF_ENTRADA') {
      const productName =
        typeof payload.productName === 'string' ? payload.productName : null;
      const pointName =
        typeof payload.pointName === 'string' ? payload.pointName : null;
      const liters =
        typeof payload.liters === 'number' ? payload.liters : Number(payload.liters);

      if (!productName || (!pointName && !overridePointId) || !liters || liters <= 0) {
        throw new BadRequestException(
          'Payload de NF_ENTRADA inválido: productName/pointName/liters obrigatórios.',
        );
      }

      const product = await this.prisma.fuelProduct.findUnique({
        where: { name: productName },
      });
      if (!product) {
        throw new BadRequestException(
          `Produto "${productName}" não cadastrado.`,
        );
      }

      let pointId = overridePointId;
      if (!pointId && pointName) {
        const p = await this.prisma.fuelPoint.findUnique({
          where: { name: pointName },
        });
        if (!p) {
          throw new BadRequestException(
            `Ponto "${pointName}" não cadastrado.`,
          );
        }
        pointId = p.id;
      }
      if (!pointId) {
        throw new BadRequestException('pointId indefinido para NF_ENTRADA');
      }

      await this.prisma.$transaction(async (tx) => {
        await this.fuelStation.applyStockDelta(tx, {
          pointId: pointId!,
          productId: product.id,
          deltaLiters: liters,
          type: 'NF_ENTRADA',
          referenceId: id,
        });
      });
    }

    await this.prisma.fuelErpImport.update({
      where: { id },
      data: {
        status: 'APROVADO',
        validatedByUserId: userId,
        validatedAt: new Date(),
      },
    });

    return { ok: true };
  }
}
