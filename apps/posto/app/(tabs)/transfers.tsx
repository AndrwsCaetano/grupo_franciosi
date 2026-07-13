import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Chip } from '../../src/components/Chip';
import { Screen } from '../../src/components/Screen';
import { useSession } from '../../src/context/SessionContext';
import {
  listPendingTransfersForPoint,
  listProducts,
  listTransfers,
} from '../../src/db/repos';
import type { Transfer, Product } from '../../src/api/fuelStation';
import { colors } from '../../src/theme';
import { formatDateTime, formatLiters } from '../../src/utils/format';

export default function TransfersScreen() {
  const router = useRouter();
  const session = useSession();
  const [pending, setPending] = useState<Transfer[]>([]);
  const [all, setAll] = useState<Transfer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const load = useCallback(async () => {
    if (!session.point) return;
    const p = await listPendingTransfersForPoint(session.point.id);
    setPending(p);
    setAll(await listTransfers());
    setProducts(await listProducts());
  }, [session.point]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const productName = (id: string) => products.find((p) => p.id === id)?.name ?? id;

  return (
    <Screen>
      <Card>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Solicitar transferência</Text>
            <Text style={styles.helper}>
              Origem: <Text style={styles.strong}>{session.point?.name}</Text>
            </Text>
          </View>
          <Button
            title="Novo pedido"
            onPress={() => router.push('/transfers/new')}
          />
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Aguardando aceite ({pending.length})</Text>
      <View style={{ gap: 10 }}>
        {pending.length === 0 ? (
          <Card>
            <Text style={{ color: colors.textMuted }}>
              Nenhuma carga pendente para este ponto.
            </Text>
          </Card>
        ) : (
          pending.map((t) => (
            <Card key={t.id}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="cube-outline" size={16} color={colors.primary} />
                    <Text style={styles.name}>{productName(t.productId)}</Text>
                  </View>
                  <Text style={styles.helper}>
                    De <Text style={styles.strong}>{t.originPointId.slice(-6)}</Text> ·{' '}
                    {formatLiters(t.liters)}
                  </Text>
                  <Text style={styles.helper}>
                    Solicitado em {formatDateTime(t.createdAt)}
                  </Text>
                </View>
                <Chip label="Pendente" tone="warning" selected compact />
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <Button
                  title="Aceitar"
                  onPress={() =>
                    router.push({ pathname: '/transfers/[id]', params: { id: t.id } })
                  }
                />
                <Button
                  title="Rejeitar"
                  variant="ghost"
                  onPress={() =>
                    router.push({
                      pathname: '/transfers/[id]',
                      params: { id: t.id, action: 'reject' },
                    })
                  }
                />
              </View>
            </Card>
          ))
        )}
      </View>

      <Text style={styles.sectionTitle}>Histórico recente</Text>
      <View style={{ gap: 8 }}>
        {all.length === 0 ? (
          <Card>
            <Text style={{ color: colors.textMuted }}>Sem transferências.</Text>
          </Card>
        ) : (
          all.slice(0, 10).map((t) => (
            <Card key={t.id}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>
                    {productName(t.productId)} · {formatLiters(t.liters)}
                  </Text>
                  <Text style={styles.helper}>
                    {t.originPointId.slice(-6)} → {t.destPointId.slice(-6)}
                  </Text>
                  <Text style={styles.helper}>{formatDateTime(t.createdAt)}</Text>
                </View>
                <Chip
                  label={transferStatusLabel(t.status)}
                  tone={
                    t.status === 'ACEITA'
                      ? 'success'
                      : t.status === 'RECUSADA'
                        ? 'danger'
                        : 'warning'
                  }
                  compact
                  selected
                />
              </View>
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}

function transferStatusLabel(status: string): string {
  if (status === 'ACEITA') return 'Aceita';
  if (status === 'RECUSADA') return 'Recusada';
  return 'Pendente';
}

const styles = StyleSheet.create({
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  helper: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  strong: { color: colors.text, fontWeight: '600' },
  name: { fontSize: 14, fontWeight: '600', color: colors.text },
  sectionTitle: {
    marginTop: 20,
    marginBottom: 8,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
