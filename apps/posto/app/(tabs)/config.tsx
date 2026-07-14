import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { fetchBootstrap } from '../../src/api/fuelStation';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Chip } from '../../src/components/Chip';
import { Screen } from '../../src/components/Screen';
import { ServerConfigModal } from '../../src/components/ServerConfigModal';
import { getApiBaseUrl } from '../../src/config';
import { useAuth } from '../../src/context/AuthContext';
import { useSession } from '../../src/context/SessionContext';
import { useSync } from '../../src/context/SyncContext';
import { resetLocalCache } from '../../src/db';
import { listPoints, replaceBootstrap } from '../../src/db/repos';
import type { FuelPoint } from '../../src/api/fuelStation';
import { colors } from '../../src/theme';
import { formatDateTime } from '../../src/utils/format';

export default function ConfigScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const session = useSession();
  const sync = useSync();

  const [points, setPoints] = useState<FuelPoint[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [serverModal, setServerModal] = useState(false);

  useEffect(() => {
    void listPoints().then(setPoints);
  }, []);

  async function onServerSwitched() {
    await signOut();
    await session.setPointId(null);
    router.replace('/login');
  }

  async function resync() {
    setMessage('Sincronizando...');
    try {
      const payload = await fetchBootstrap();
      await replaceBootstrap(payload);
      await session.markBootstrapped();
      await session.refresh();
      setPoints(await listPoints());
      setMessage('Sincronização concluída.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage(`Erro: ${msg}`);
    }
  }

  async function clearCache() {
    Alert.alert(
      'Limpar cache local',
      'Isso remove pontos, produtos, máquinas e transferências gravados. A fila de sincronização será mantida. Confirma?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: async () => {
            await resetLocalCache();
            await session.setPointId(null);
            router.replace('/bootstrap');
          },
        },
      ],
    );
  }

  async function doLogout() {
    Alert.alert('Sair', 'Encerrar a sessão neste dispositivo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/login');
        },
      },
    ]);
  }

  return (
    <Screen>
      <Card>
        <Text style={styles.sectionTitle}>Operador</Text>
        <Text style={styles.name}>{user?.name ?? '—'}</Text>
        <Text style={styles.helper}>{user?.email ?? ''}</Text>
        {user?.permissions?.length ? (
          <View style={styles.permWrap}>
            {user.permissions.slice(0, 6).map((p) => (
              <Chip key={p} label={p} compact />
            ))}
          </View>
        ) : null}
      </Card>

      <Card style={{ marginTop: 12 }}>
        <Text style={styles.sectionTitle}>Ponto de trabalho</Text>
        <Text style={styles.helper}>
          Atual:{' '}
          <Text style={styles.strong}>{session.point?.name ?? 'nenhum'}</Text>
        </Text>
        <View style={{ gap: 6, marginTop: 8 }}>
          {points.map((p) => {
            const active = p.id === session.point?.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => session.setPointId(p.id)}
                style={[
                  styles.option,
                  {
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.primarySoft : colors.surface,
                  },
                ]}
              >
                <Text style={{ fontWeight: '600', color: colors.text }}>{p.name}</Text>
                <Text style={styles.helper}>{p.type === 'COMBOIO' ? 'Comboio' : 'Posto'}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card style={{ marginTop: 12 }}>
        <Text style={styles.sectionTitle}>API</Text>
        <Text style={styles.helper}>
          Servidor: <Text style={styles.strong}>{getApiBaseUrl()}</Text>
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <Button
            title="Trocar servidor"
            onPress={() => setServerModal(true)}
            variant="secondary"
          />
          <Button title="Ressincronizar" onPress={resync} disabled={!sync.online} />
        </View>
        <Text style={styles.helper}>
          Última sync: {formatDateTime(session.lastBootstrapAt)}
        </Text>
        {message ? <Text style={styles.helper}>{message}</Text> : null}
      </Card>

      <Card style={{ marginTop: 12 }}>
        <Text style={styles.sectionTitle}>Manutenção</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Button title="Limpar cache local" variant="ghost" onPress={clearCache} />
          <Button title="Sair (logout)" variant="danger" onPress={doLogout} />
        </View>
        <Text style={styles.helper}>
          App v{Constants.expoConfig?.version ?? '0.0.0'} · SDK{' '}
          {Constants.expoConfig?.sdkVersion ?? '—'}
        </Text>
      </Card>

      <ServerConfigModal
        visible={serverModal}
        onClose={() => setServerModal(false)}
        onServerSwitched={onServerSwitched}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  name: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 4 },
  helper: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  strong: { color: colors.text, fontWeight: '600' },
  permWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  option: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
});
