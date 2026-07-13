import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Chip } from '../../src/components/Chip';
import { Screen } from '../../src/components/Screen';
import { useSync } from '../../src/context/SyncContext';
import * as queue from '../../src/db/queue';
import { colors } from '../../src/theme';
import { formatDateTime } from '../../src/utils/format';

const KIND_LABEL: Record<queue.QueueKind, string> = {
  dispensing: 'Abastecimento',
  transfer_request: 'Solicitação de transferência',
  transfer_accept: 'Aceite de transferência',
  transfer_reject: 'Rejeição de transferência',
};

export default function FilaScreen() {
  const sync = useSync();
  const [rows, setRows] = useState<queue.QueueItem[]>([]);

  const load = useCallback(async () => {
    const list = await queue.listQueue();
    setRows(list);
    await sync.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function remove(id: number) {
    Alert.alert('Remover item', 'Deseja remover este item da fila? A operação não será reenviada.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          await sync.removeItem(id);
          await load();
        },
      },
    ]);
  }

  const pending = rows.filter((r) => r.status === 'pending' || r.status === 'syncing');
  const errors = rows.filter((r) => r.status === 'error');
  const done = rows.filter((r) => r.status === 'done');

  return (
    <Screen>
      <Card>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>
              {sync.online ? 'Conectado à API' : 'Sem conexão'}
            </Text>
            <Text style={styles.helper}>
              {pending.length} pendentes · {errors.length} com erro · {done.length} concluídos
            </Text>
          </View>
          <Chip
            label={sync.online ? 'Online' : 'Offline'}
            tone={sync.online ? 'success' : 'warning'}
            selected
            compact
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <Button
            title="Forçar sincronização"
            onPress={() => sync.forceSync().then(load)}
            disabled={!sync.online}
          />
          <Button
            title="Limpar concluídos"
            variant="ghost"
            onPress={() => sync.purgeDone().then(load)}
          />
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Pendentes / em envio</Text>
      <QueueList items={pending} onRemove={remove} />

      <Text style={styles.sectionTitle}>Com erro</Text>
      <QueueList items={errors} onRemove={remove} />

      <Text style={styles.sectionTitle}>Últimos concluídos</Text>
      <QueueList items={done.slice(-10).reverse()} onRemove={remove} readOnly />
    </Screen>
  );
}

function QueueList({
  items,
  onRemove,
  readOnly,
}: {
  items: queue.QueueItem[];
  onRemove: (id: number) => void;
  readOnly?: boolean;
}) {
  if (items.length === 0) {
    return (
      <Card>
        <Text style={{ color: colors.textMuted }}>Vazio.</Text>
      </Card>
    );
  }
  return (
    <View style={{ gap: 8 }}>
      {items.map((it) => (
        <Card key={it.id}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <Ionicons name={iconFor(it.kind)} size={16} color={colors.primary} />
                <Text style={styles.rowTitle}>{KIND_LABEL[it.kind] ?? it.kind}</Text>
              </View>
              <Text style={styles.helper}>
                id: {it.offlineClientId.slice(0, 8)}… · tentativas: {it.attempts}
              </Text>
              <Text style={styles.helper}>
                Criado em {formatDateTime(it.createdAt)}
              </Text>
              {it.lastError ? (
                <Text style={[styles.helper, { color: colors.danger }]}>
                  Erro: {it.lastError}
                </Text>
              ) : null}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Chip
                label={statusLabel(it.status)}
                tone={statusTone(it.status)}
                selected
                compact
              />
              {!readOnly && (
                <Button title="Remover" variant="ghost" size="sm" onPress={() => onRemove(it.id)} />
              )}
            </View>
          </View>
        </Card>
      ))}
    </View>
  );
}

function iconFor(k: queue.QueueKind): keyof typeof Ionicons.glyphMap {
  switch (k) {
    case 'dispensing':
      return 'flash-outline';
    case 'transfer_request':
      return 'paper-plane-outline';
    case 'transfer_accept':
      return 'checkmark-circle-outline';
    case 'transfer_reject':
      return 'close-circle-outline';
    default:
      return 'ellipsis-horizontal';
  }
}
function statusLabel(s: queue.QueueStatus): string {
  return { pending: 'Pendente', syncing: 'Enviando', error: 'Erro', done: 'OK' }[s];
}
function statusTone(s: queue.QueueStatus): 'success' | 'warning' | 'danger' | 'info' {
  return { pending: 'warning', syncing: 'info', error: 'danger', done: 'success' }[s] as any;
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
  rowTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
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
