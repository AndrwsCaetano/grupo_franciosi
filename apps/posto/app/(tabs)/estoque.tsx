import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Chip } from '../../src/components/Chip';
import { ProgressBar } from '../../src/components/ProgressBar';
import { Screen } from '../../src/components/Screen';
import {
  classifyStock,
  colorForStatus,
  labelForStatus,
  StatusDot,
  StockStatus,
} from '../../src/components/StatusDot';
import { useSession } from '../../src/context/SessionContext';
import {
  listLocalDispensingsForPoint,
  listStocksForPoint,
  StockRow,
  LocalDispensing,
} from '../../src/db/repos';
import { colors } from '../../src/theme';
import { formatDateTime, formatLiters } from '../../src/utils/format';

const FILTERS: { value: 'all' | StockStatus; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'ok', label: 'Disponíveis' },
  { value: 'reserva', label: 'Em reserva' },
  { value: 'critico', label: 'Críticos' },
  { value: 'esgotado', label: 'Esgotados' },
];

export default function EstoqueScreen() {
  const router = useRouter();
  const session = useSession();
  const [stocks, setStocks] = useState<StockRow[]>([]);
  const [history, setHistory] = useState<LocalDispensing[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['value']>('all');

  const load = useCallback(async () => {
    if (!session.point) return;
    const s = await listStocksForPoint(session.point.id);
    setStocks(s);
    const h = await listLocalDispensingsForPoint(session.point.id, 10);
    setHistory(h);
  }, [session.point]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const filtered = useMemo(() => {
    if (filter === 'all') return stocks;
    return stocks.filter(
      (s) =>
        classifyStock(s.quantityLiters, s.minReserveLiters ?? 0, s.pointCapacityLiters ?? 0) ===
        filter,
    );
  }, [filter, stocks]);

  return (
    <Screen>
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Chip
            key={f.value}
            label={f.label}
            compact
            selected={filter === f.value}
            onPress={() => setFilter(f.value)}
          />
        ))}
      </View>

      <View style={{ gap: 10, marginTop: 10 }}>
        {filtered.length === 0 && (
          <Card>
            <Text style={{ color: colors.textMuted }}>
              Nenhum produto para este filtro.
            </Text>
          </Card>
        )}
        {filtered.map((s) => {
          const capacity = s.pointCapacityLiters ?? 0;
          const status = classifyStock(s.quantityLiters, s.minReserveLiters ?? 0, capacity);
          const c = colorForStatus(status);
          return (
            <Card key={s.id}>
              <View style={styles.cardHead}>
                <View>
                  <Text style={styles.title}>{s.productName ?? 'Produto'}</Text>
                  <Text style={styles.subtitle}>{s.productUnit ?? 'L'}</Text>
                </View>
                <StatusDot status={status} label />
              </View>

              <View style={{ marginTop: 10 }}>
                <Text style={styles.metric}>
                  {formatLiters(s.quantityLiters)}
                  {capacity ? (
                    <Text style={styles.metricSuffix}> de {formatLiters(capacity)}</Text>
                  ) : null}
                </Text>
                <ProgressBar value={s.quantityLiters} max={capacity || 1} color={c} />
                <View style={styles.rowBetween}>
                  <Text style={styles.helper}>
                    Alerta mín.: {formatLiters(s.minReserveLiters ?? 0)}
                  </Text>
                </View>
              </View>

              <View style={styles.actionsRow}>
                <Button
                  title="Transferir"
                  variant="secondary"
                  onPress={() =>
                    router.push({
                      pathname: '/transfers/new',
                      params: { productId: s.productId },
                    })
                  }
                />
                <Button
                  title="Aceitar carga"
                  variant="ghost"
                  onPress={() => router.push('/(tabs)/transfers')}
                />
              </View>
            </Card>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Movimentações recentes</Text>
      <View style={{ gap: 8 }}>
        {history.length === 0 ? (
          <Card>
            <Text style={{ color: colors.textMuted }}>
              Nenhuma movimentação registrada neste ponto ainda.
            </Text>
          </Card>
        ) : (
          history.map((d) => (
            <Card key={d.offlineClientId} style={styles.historyRow}>
              <View>
                <Text style={styles.historyTitle}>
                  Abastecimento · {formatLiters(d.liters)}
                </Text>
                <Text style={styles.helper}>
                  {formatDateTime(d.createdAtLocal)} · máquina {d.machineryId.slice(-6)}
                </Text>
              </View>
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  subtitle: { color: colors.textMuted, fontSize: 12 },
  metric: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 6 },
  metricSuffix: { fontSize: 12, fontWeight: '400', color: colors.textMuted },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  helper: { color: colors.textMuted, fontSize: 12 },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  sectionTitle: {
    marginTop: 20,
    marginBottom: 8,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyTitle: { fontWeight: '600', color: colors.text },
});
