import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Chip } from '../../src/components/Chip';
import { Field } from '../../src/components/Field';
import { Screen } from '../../src/components/Screen';
import { useSync } from '../../src/context/SyncContext';
import { enqueue } from '../../src/db/queue';
import {
  getPoint,
  getTransfer,
  incrementStock,
  listProducts,
  setTransferStatus,
} from '../../src/db/repos';
import { processQueue } from '../../src/sync';
import type { Product, Transfer, FuelPoint } from '../../src/api/fuelStation';
import { colors } from '../../src/theme';
import { formatDateTime, formatLiters } from '../../src/utils/format';
import { uuid } from '../../src/utils/id';

type Action = 'accept' | 'reject';

export default function TransferConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; action?: string }>();
  const sync = useSync();

  const initialAction: Action = params.action === 'reject' ? 'reject' : 'accept';
  const [action, setAction] = useState<Action>(initialAction);

  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [origin, setOrigin] = useState<FuelPoint | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!params.id) return;
      const t = await getTransfer(String(params.id));
      setTransfer(t);
      if (t) {
        const products = await listProducts();
        setProduct(products.find((p) => p.id === t.productId) ?? null);
        setOrigin(await getPoint(t.originPointId));
      }
    })();
  }, [params.id]);

  async function submit() {
    setError(null);
    if (!transfer) return;
    setSaving(true);
    try {
      const offlineClientId = uuid();
      if (action === 'accept') {
        await setTransferStatus(transfer.id, 'ACEITA');
        // O backend sempre credita o valor integral de `liters` no destino
        // (ver TransfersService.accept) — não há aceite parcial na API real.
        await incrementStock(transfer.destPointId, transfer.productId, transfer.liters);
        await enqueue({
          offlineClientId,
          kind: 'transfer_accept',
          payload: { transferId: transfer.id },
        });
      } else {
        await setTransferStatus(transfer.id, 'RECUSADA');
        await enqueue({
          offlineClientId,
          kind: 'transfer_reject',
          payload: { transferId: transfer.id, reason: reason.trim() || undefined },
        });
      }
      await sync.refresh();
      void processQueue();
      Alert.alert(
        action === 'accept' ? 'Carga aceita' : 'Carga rejeitada',
        action === 'accept'
          ? 'Estoque atualizado localmente. O envio será feito quando houver conexão.'
          : 'Status atualizado. O envio será feito quando houver conexão.',
        [{ text: 'OK', onPress: () => router.replace('/(tabs)/transfers') }],
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  if (!params.id) {
    return (
      <Screen>
        <Card>
          <Text style={{ color: colors.danger }}>Transferência não informada.</Text>
        </Card>
      </Screen>
    );
  }

  if (!transfer) {
    return (
      <Screen>
        <Card>
          <Text style={{ color: colors.textMuted }}>Carregando...</Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Card>
        <Text style={styles.title}>
          {product?.name ?? 'Produto'} · {formatLiters(transfer.liters)}
        </Text>
        <Text style={styles.helper}>
          Origem:{' '}
          <Text style={styles.strong}>{origin?.name ?? transfer.originPointId}</Text>
        </Text>
        <Text style={styles.helper}>
          Solicitado em {formatDateTime(transfer.createdAt)}
        </Text>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
          <Chip
            label="Aceitar"
            tone="success"
            selected={action === 'accept'}
            onPress={() => setAction('accept')}
          />
          <Chip
            label="Rejeitar"
            tone="danger"
            selected={action === 'reject'}
            onPress={() => setAction('reject')}
          />
        </View>
      </Card>

      <Card style={{ marginTop: 12 }}>
        {action === 'accept' ? (
          <Text style={styles.helper}>
            Ao aceitar, {formatLiters(transfer.liters)} serão creditados no estoque
            deste ponto. A API não permite ajustar a quantidade recebida.
          </Text>
        ) : (
          <Field
            label="Motivo da rejeição"
            value={reason}
            onChangeText={setReason}
            placeholder="Ex.: divergência de quantidade, produto errado..."
            multiline
            numberOfLines={3}
          />
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
          <Button
            title={action === 'accept' ? 'Confirmar aceite' : 'Confirmar rejeição'}
            variant={action === 'reject' ? 'danger' : 'primary'}
            onPress={submit}
            loading={saving}
            size="lg"
          />
          <Button title="Voltar" variant="ghost" onPress={() => router.back()} disabled={saving} />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  helper: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  strong: { color: colors.text, fontWeight: '600' },
  error: { color: colors.danger, fontSize: 12, marginTop: 8 },
});
