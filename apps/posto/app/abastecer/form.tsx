import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSession } from '../../src/context/SessionContext';
import { useSync } from '../../src/context/SyncContext';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Chip } from '../../src/components/Chip';
import { Field } from '../../src/components/Field';
import { Screen } from '../../src/components/Screen';
import { classifyStock, colorForStatus, labelForStatus } from '../../src/components/StatusDot';
import {
  decrementStock,
  getMachinery,
  insertLocalDispensing,
  listProducts,
  listStocksForPoint,
  StockRow,
  updateMachineryMeters,
} from '../../src/db/repos';
import { enqueue } from '../../src/db/queue';
import { processQueue } from '../../src/sync';
import type { Machinery, Product } from '../../src/api/fuelStation';
import { colors, radius } from '../../src/theme';
import { formatLiters, formatNumber } from '../../src/utils/format';
import { uuid } from '../../src/utils/id';

export default function AbastecerFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ machineryId?: string }>();
  const machineryId = params.machineryId;

  const session = useSession();
  const sync = useSync();

  const [machine, setMachine] = useState<Machinery | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [stocks, setStocks] = useState<StockRow[]>([]);

  const [productId, setProductId] = useState<string | null>(null);
  const [liters, setLiters] = useState('');
  const [hourMeter, setHourMeter] = useState('');
  const [km, setKm] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!machineryId) return;
      const m = await getMachinery(machineryId);
      setMachine(m);
      const p = await listProducts();
      setProducts(p);
      if (m?.defaultProductId) setProductId(m.defaultProductId);
      else if (p.length > 0) setProductId(p[0].id);
      if (session.point) setStocks(await listStocksForPoint(session.point.id));
    })();
  }, [machineryId, session.point]);

  // hourMeter/odometerKm são sempre numéricos (default 0) no schema real —
  // usamos o que já tem leitura para decidir qual medidor exibir.
  const usesHourMeter = useMemo(() => {
    if (!machine) return true;
    if (machine.odometerKm > 0 && machine.hourMeter === 0) return false;
    return true;
  }, [machine]);

  const selectedStock = useMemo(
    () => stocks.find((s) => s.productId === productId) ?? null,
    [stocks, productId],
  );

  const parsedLiters = useMemo(() => {
    const v = liters.replace(',', '.');
    const n = parseFloat(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [liters]);

  const stockAfter = useMemo(() => {
    if (!selectedStock || parsedLiters == null) return null;
    return selectedStock.quantityLiters - parsedLiters;
  }, [selectedStock, parsedLiters]);

  const submit = useCallback(async () => {
    setError(null);
    if (!machine) {
      setError('Máquina inválida.');
      return;
    }
    if (!session.point) {
      setError('Nenhum ponto ativo. Reabra o app.');
      return;
    }
    if (!productId) {
      setError('Selecione um produto.');
      return;
    }
    if (parsedLiters == null) {
      setError('Informe litros abastecidos.');
      return;
    }
    const hm = hourMeter.trim() ? parseFloat(hourMeter.replace(',', '.')) : null;
    const kmN = km.trim() ? parseFloat(km.replace(',', '.')) : null;
    if (usesHourMeter && hm == null) {
      setError('Informe o horímetro atual.');
      return;
    }
    if (!usesHourMeter && kmN == null) {
      setError('Informe a quilometragem atual.');
      return;
    }

    setSaving(true);
    try {
      const offlineClientId = uuid();
      const now = new Date().toISOString();
      await insertLocalDispensing({
        offlineClientId,
        machineryId: machine.id,
        pointId: session.point.id,
        productId,
        liters: parsedLiters,
        hourMeterReported: hm,
        kmReported: kmN,
        notes: notes.trim() || null,
        createdAtLocal: now,
      });
      await decrementStock(session.point.id, productId, parsedLiters);
      await updateMachineryMeters(machine.id, { hourMeter: hm, odometerKm: kmN });
      // Corpo exato de CreateDispensingDto — sem campos locais (ex.: notes).
      await enqueue({
        offlineClientId,
        kind: 'dispensing',
        payload: {
          machineryId: machine.id,
          pointId: session.point.id,
          productId,
          liters: parsedLiters,
          hourMeterReported: hm ?? undefined,
          kmReported: kmN ?? undefined,
          offlineClientId,
        },
      });
      await sync.refresh();
      // fire-and-forget sync attempt
      void processQueue();

      Alert.alert(
        'Abastecimento registrado',
        `Foram descontados ${formatLiters(parsedLiters)} do estoque local. O envio será feito quando houver conexão.`,
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)/dashboard'),
          },
        ],
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }, [
    hourMeter,
    km,
    machine,
    notes,
    parsedLiters,
    productId,
    router,
    session.point,
    sync,
    usesHourMeter,
  ]);

  if (!machineryId) {
    return (
      <Screen>
        <Card>
          <Text style={{ color: colors.danger }}>Máquina não informada.</Text>
          <Button title="Ler QR" onPress={() => router.replace('/abastecer/scan')} />
        </Card>
      </Screen>
    );
  }

  if (!machine) {
    return (
      <Screen>
        <Card>
          <Text style={{ color: colors.textMuted }}>Carregando máquina...</Text>
        </Card>
      </Screen>
    );
  }

  const stockStatus = selectedStock
    ? classifyStock(
        selectedStock.quantityLiters,
        selectedStock.minReserveLiters ?? 0,
        selectedStock.pointCapacityLiters ?? 0,
      )
    : null;

  return (
    <Screen>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={styles.iconBadge}>
            <Ionicons name="construct" color="#fff" size={22} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.tag}>#{machine.tag}</Text>
            <Text style={styles.machineName}>{machine.name}</Text>
            <Text style={styles.helper}>
              {usesHourMeter
                ? `Horímetro atual: ${formatNumber(machine.hourMeter, 1)} h`
                : `Odômetro atual: ${formatNumber(machine.odometerKm, 0)} km`}
            </Text>
          </View>
          <Chip
            label={statusLabel(machine.status)}
            tone={machine.status === 'ATIVO' ? 'success' : 'warning'}
            selected
            compact
          />
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
        {selectedStock && stockStatus ? (
          <View style={styles.stockBox}>
            <View style={{ flex: 1 }}>
              <Text style={styles.helper}>Estoque disponível</Text>
              <Text style={styles.stockValue}>
                {formatLiters(selectedStock.quantityLiters)}
                {selectedStock.pointCapacityLiters ? (
                  <Text style={styles.helper}>
                    {'  '}/ {formatLiters(selectedStock.pointCapacityLiters)}
                  </Text>
                ) : null}
              </Text>
              {stockAfter != null ? (
                <Text
                  style={[
                    styles.helper,
                    stockAfter < 0 ? { color: colors.danger, fontWeight: '600' } : null,
                  ]}
                >
                  Após esta operação: {formatLiters(Math.max(stockAfter, 0))}
                  {stockAfter < 0 ? ' (estoque insuficiente)' : ''}
                </Text>
              ) : null}
            </View>
            <Chip
              label={labelForStatus(stockStatus)}
              tone={
                stockStatus === 'ok'
                  ? 'success'
                  : stockStatus === 'esgotado'
                    ? 'danger'
                    : 'warning'
              }
              selected
              compact
              style={{ backgroundColor: colorForStatus(stockStatus) }}
            />
          </View>
        ) : null}
      </Card>

      <Card style={{ marginTop: 12 }}>
        <Text style={styles.sectionTitle}>Medição</Text>
        <View style={{ gap: 12, marginTop: 8 }}>
          <Field
            label="Litros abastecidos *"
            keyboardType="decimal-pad"
            value={liters}
            onChangeText={setLiters}
            placeholder="Ex.: 42,5"
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              onPress={() => {
                setHourMeter('');
                setKm('');
              }}
              style={styles.mtSwitchWrap}
            >
              <MeterToggle
                label="Horímetro"
                active={usesHourMeter}
                onPress={() => {
                  if (!usesHourMeter) {
                    setKm('');
                  }
                }}
              />
              <MeterToggle
                label="Km"
                active={!usesHourMeter}
                onPress={() => {
                  if (usesHourMeter) {
                    setHourMeter('');
                  }
                }}
              />
            </Pressable>
          </View>
          {usesHourMeter ? (
            <Field
              label="Horímetro atual (h) *"
              keyboardType="decimal-pad"
              value={hourMeter}
              onChangeText={setHourMeter}
              placeholder={machine.hourMeter ? formatNumber(machine.hourMeter, 1) : '0,0'}
            />
          ) : (
            <Field
              label="Odômetro atual (km) *"
              keyboardType="numeric"
              value={km}
              onChangeText={setKm}
              placeholder={machine.odometerKm ? formatNumber(machine.odometerKm, 0) : '0'}
            />
          )}
          <Field
            label="Observações"
            value={notes}
            onChangeText={setNotes}
            placeholder="opcional"
            multiline
            numberOfLines={3}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
          <Button title="Salvar" onPress={submit} loading={saving} size="lg" />
          <Button
            title="Descartar"
            variant="ghost"
            onPress={() => router.back()}
            disabled={saving}
          />
        </View>
      </Card>
    </Screen>
  );
}

function statusLabel(s: string): string {
  if (s === 'ATIVO') return 'Ativa';
  if (s === 'MANUTENCAO') return 'Manutenção';
  if (s === 'INATIVO') return 'Inativa';
  return s;
}

function MeterToggle({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.toggle,
        {
          backgroundColor: active ? colors.primary : colors.bgAlt,
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
    >
      <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '600' }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tag: { color: colors.primaryHover, fontWeight: '700' },
  machineName: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 2 },
  helper: { color: colors.textMuted, fontSize: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  stockBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.bgAlt,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stockValue: { fontSize: 18, fontWeight: '700', color: colors.text },
  error: { color: colors.danger, fontSize: 12, marginTop: 8 },
  mtSwitchWrap: { flexDirection: 'row', gap: 6 },
  toggle: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
});
