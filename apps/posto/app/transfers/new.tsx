import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Chip } from '../../src/components/Chip';
import { Field } from '../../src/components/Field';
import { Screen } from '../../src/components/Screen';
import { useSession } from '../../src/context/SessionContext';
import { useSync } from '../../src/context/SyncContext';
import { enqueue } from '../../src/db/queue';
import {
  listPoints,
  listProducts,
  upsertTransfer,
} from '../../src/db/repos';
import { processQueue } from '../../src/sync';
import type { FuelPoint, Product } from '../../src/api/fuelStation';
import { colors } from '../../src/theme';
import { uuid } from '../../src/utils/id';

export default function NewTransferScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ productId?: string }>();
  const session = useSession();
  const sync = useSync();

  const [points, setPoints] = useState<FuelPoint[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState<string | null>(
    params.productId ? String(params.productId) : null,
  );
  const [destinationId, setDestinationId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const p = await listPoints();
      setPoints(p);
      const pr = await listProducts();
      setProducts(pr);
      if (!productId && pr[0]) setProductId(pr[0].id);
      const others = p.filter((x) => x.id !== session.point?.id);
      if (!destinationId && others[0]) setDestinationId(others[0].id);
    })();
  }, [destinationId, productId, session.point?.id]);

  const parsedQty = useMemo(() => {
    const n = parseFloat(quantity.replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [quantity]);

  async function submit() {
    setError(null);
    if (!session.point) return;
    if (!productId) {
      setError('Selecione o produto.');
      return;
    }
    if (!destinationId) {
      setError('Selecione o destino.');
      return;
    }
    if (parsedQty == null) {
      setError('Informe a quantidade.');
      return;
    }
    setSaving(true);
    try {
      const offlineClientId = uuid();
      const now = new Date().toISOString();
      const localTransfer = {
        id: offlineClientId,
        originPointId: session.point.id,
        destPointId: destinationId,
        productId,
        liters: parsedQty,
        status: 'PENDENTE' as const,
        observation: notes.trim() || null,
        createdAt: now,
      };
      await upsertTransfer(localTransfer);
      // Corpo exato de CreateTransferDto — a API não tem offlineClientId aqui,
      // então a dedupe de reenvio é só local (registro já enfileirado).
      await enqueue({
        offlineClientId,
        kind: 'transfer_request',
        payload: {
          originPointId: session.point.id,
          destPointId: destinationId,
          productId,
          liters: parsedQty,
          observation: notes.trim() || undefined,
        },
      });
      await sync.refresh();
      void processQueue();
      Alert.alert('Pedido registrado', 'A solicitação será enviada quando houver conexão.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/transfers') },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Card>
        <Text style={styles.title}>Solicitar transferência</Text>
        <Text style={styles.helper}>
          Origem: <Text style={styles.strong}>{session.point?.name ?? '—'}</Text>
        </Text>
      </Card>

      <Card style={{ marginTop: 12 }}>
        <Text style={styles.sectionTitle}>Destino</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {points
            .filter((p) => p.id !== session.point?.id)
            .map((p) => (
              <Chip
                key={p.id}
                label={p.name}
                selected={p.id === destinationId}
                onPress={() => setDestinationId(p.id)}
              />
            ))}
          {points.length <= 1 && (
            <Text style={styles.helper}>
              Nenhum outro ponto sincronizado.
            </Text>
          )}
        </View>
      </Card>

      <Card style={{ marginTop: 12 }}>
        <Text style={styles.sectionTitle}>Produto</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {products.map((p) => (
            <Chip
              key={p.id}
              label={p.name}
              selected={p.id === productId}
              onPress={() => setProductId(p.id)}
            />
          ))}
        </View>
      </Card>

      <Card style={{ marginTop: 12 }}>
        <Field
          label="Quantidade (L) *"
          keyboardType="decimal-pad"
          value={quantity}
          onChangeText={setQuantity}
          placeholder="Ex.: 500"
        />
        <View style={{ height: 12 }} />
        <Field
          label="Observações"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          placeholder="opcional"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
          <Button title="Enviar pedido" onPress={submit} loading={saving} size="lg" />
          <Button title="Cancelar" variant="ghost" onPress={() => router.back()} disabled={saving} />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  helper: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  strong: { color: colors.text, fontWeight: '600' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  error: { color: colors.danger, fontSize: 12, marginTop: 8 },
});
