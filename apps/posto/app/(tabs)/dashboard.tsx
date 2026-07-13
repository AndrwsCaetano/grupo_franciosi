import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
} from '../../src/components/StatusDot';
import { useAuth } from '../../src/context/AuthContext';
import { useSession } from '../../src/context/SessionContext';
import { useSync } from '../../src/context/SyncContext';
import { listStocksForPoint, StockRow } from '../../src/db/repos';
import { colors } from '../../src/theme';
import { formatDateTime, formatLiters, greetingByHour } from '../../src/utils/format';

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const session = useSession();
  const sync = useSync();
  const [stocks, setStocks] = useState<StockRow[]>([]);

  const pointId = session.point?.id;
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (!pointId) return;
        const rows = await listStocksForPoint(pointId);
        if (!cancelled) setStocks(rows);
        await sync.refresh();
      })();
      return () => {
        cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pointId]),
  );

  return (
    <Screen>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>
            {greetingByHour()}, {user?.name?.split(' ')[0] ?? 'operador'}
          </Text>
          <Text style={styles.subtitle}>
            Ponto: <Text style={styles.strong}>{session.point?.name ?? '—'}</Text>
          </Text>
        </View>
        <View style={styles.badges}>
          <Chip
            label={sync.online ? 'Online' : 'Offline'}
            tone={sync.online ? 'success' : 'warning'}
            selected={sync.online}
            compact
          />
          <Chip label="ERP: ativo" tone="info" selected compact />
        </View>
      </View>

      <View style={styles.actionsRow}>
        <QuickAction
          icon="flash-outline"
          label="Abastecer"
          onPress={() => router.push('/abastecer/scan')}
        />
        <QuickAction
          icon="swap-horizontal-outline"
          label="Transferir"
          onPress={() => router.push('/transfers/new')}
        />
      </View>

      <Card style={{ marginTop: 12 }}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Fila de sincronização</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {sync.counts.pending > 0 && (
              <Chip label={`Pendentes: ${sync.counts.pending}`} tone="warning" compact selected />
            )}
            {sync.counts.error > 0 && (
              <Chip label={`Erros: ${sync.counts.error}`} tone="danger" compact selected />
            )}
            {sync.counts.pending + sync.counts.error === 0 && (
              <Chip label="Tudo sincronizado" tone="success" compact selected />
            )}
          </View>
        </View>
        <Text style={styles.helper}>
          Última sync: {formatDateTime(session.lastBootstrapAt)}
        </Text>
        {sync.counts.pending + sync.counts.error > 0 && (
          <View style={{ marginTop: 10 }}>
            <Button
              title="Forçar sincronização"
              variant="secondary"
              onPress={() => sync.forceSync()}
            />
          </View>
        )}
      </Card>

      <Card style={{ marginTop: 12 }}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Estoque neste ponto</Text>
          <Chip
            label="Ver tudo"
            tone="info"
            compact
            onPress={() => router.push('/(tabs)/estoque')}
          />
        </View>

        <View style={{ marginTop: 8, gap: 10 }}>
          {stocks.length === 0 ? (
            <Text style={styles.helper}>
              Nenhum estoque cadastrado. Sincronize novamente em Configurações.
            </Text>
          ) : (
            stocks.slice(0, 5).map((s) => {
              const capacity = s.pointCapacityLiters ?? 0;
              const status = classifyStock(s.quantityLiters, s.minReserveLiters ?? 0, capacity);
              return (
                <View key={s.id} style={styles.stockRow}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <StatusDot status={status} />
                      <Text style={styles.stockName}>{s.productName ?? 'Produto'}</Text>
                    </View>
                    <Text style={styles.helper}>
                      {formatLiters(s.quantityLiters)}
                      {capacity ? ` de ${formatLiters(capacity)}` : ''}
                    </Text>
                    <View style={{ marginTop: 4 }}>
                      <ProgressBar
                        value={s.quantityLiters}
                        max={capacity || 1}
                        color={colorForStatus(status)}
                      />
                    </View>
                  </View>
                  <Text style={{ color: colorForStatus(status), fontSize: 12, fontWeight: '600' }}>
                    {labelForStatus(status)}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </Card>
    </Screen>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.85 : 1 }]}
    >
      <Card style={styles.action}>
        <View style={styles.actionIcon}>
          <Ionicons name={icon} color={colors.onPrimary} size={22} />
        </View>
        <Text style={styles.actionLabel}>{label}</Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  greeting: { fontSize: 20, fontWeight: '700', color: colors.text },
  subtitle: { color: colors.textMuted, marginTop: 2 },
  strong: { color: colors.text, fontWeight: '600' },
  badges: { alignItems: 'flex-end', gap: 4 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  action: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  actionLabel: { fontWeight: '600', color: colors.text },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  helper: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stockName: { fontWeight: '600', color: colors.text },
});
