import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fetchBootstrap } from '../src/api/fuelStation';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { ProgressBar } from '../src/components/ProgressBar';
import { Screen } from '../src/components/Screen';
import { useAuth } from '../src/context/AuthContext';
import { useSession } from '../src/context/SessionContext';
import { listPoints, replaceBootstrap } from '../src/db/repos';
import type { FuelPoint } from '../src/api/fuelStation';
import { colors } from '../src/theme';

type Phase = 'idle' | 'downloading' | 'saving' | 'ready' | 'error';

export default function BootstrapScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const session = useSession();

  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [points, setPoints] = useState<FuelPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run() {
    setError(null);
    setPhase('downloading');
    setMessage('Baixando dados iniciais...');
    setProgress(0.2);
    try {
      const payload = await fetchBootstrap();
      setProgress(0.55);
      setMessage(
        `Recebidos: ${payload.points?.length ?? 0} pontos · ${
          payload.machinery?.length ?? 0
        } máquinas · ${payload.products?.length ?? 0} produtos.`,
      );
      setPhase('saving');
      await replaceBootstrap(payload);
      setProgress(0.85);
      await session.markBootstrapped();
      const all = await listPoints();
      setPoints(all);
      setSelectedPoint(all[0]?.id ?? null);
      setProgress(1);
      setMessage('Sincronização concluída.');
      setPhase('ready');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setPhase('error');
    }
  }

  async function start() {
    if (!selectedPoint) return;
    await session.setPointId(selectedPoint);
    router.replace('/(tabs)/dashboard');
  }

  return (
    <Screen>
      <View style={{ gap: 16 }}>
        <View>
          <Text style={styles.h1}>Bem-vindo, {user?.name ?? 'Operador'}</Text>
          <Text style={styles.subtitle}>
            Vamos preparar o app para trabalhar offline.
          </Text>
        </View>

        <Card>
          <Text style={styles.sectionTitle}>Sincronização inicial</Text>
          <View style={{ marginTop: 8 }}>
            <ProgressBar value={progress} max={1} />
            <Text style={styles.msg}>{message || 'Aguardando...'}</Text>
          </View>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              <Button title="Tentar novamente" onPress={run} variant="secondary" />
            </View>
          ) : null}
        </Card>

        {phase === 'ready' && (
          <Card>
            <Text style={styles.sectionTitle}>Ponto de trabalho</Text>
            <Text style={styles.help}>
              Selecione o ponto de abastecimento em que você vai operar hoje.
            </Text>
            <View style={{ gap: 8, marginTop: 12 }}>
              {points.map((p) => {
                const active = p.id === selectedPoint;
                return (
                  <PointOption
                    key={p.id}
                    label={p.name}
                    hint={p.type === 'COMBOIO' ? 'Comboio' : 'Posto'}
                    active={active}
                    onPress={() => setSelectedPoint(p.id)}
                  />
                );
              })}
              {points.length === 0 && (
                <Text style={styles.help}>
                  Nenhum ponto retornado pela API. Verifique permissões do usuário.
                </Text>
              )}
            </View>
            <View style={{ marginTop: 16 }}>
              <Button
                title="Iniciar trabalho"
                onPress={start}
                size="lg"
                fullWidth
                disabled={!selectedPoint}
              />
            </View>
          </Card>
        )}
      </View>
    </Screen>
  );
}

function PointOption({
  label,
  hint,
  active,
  onPress,
}: {
  label: string;
  hint?: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.optionRow,
        {
          borderColor: active ? colors.primary : colors.border,
          backgroundColor: active ? colors.primarySoft : colors.surface,
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '600', color: colors.text }}>{label}</Text>
        {hint ? <Text style={{ color: colors.textMuted, fontSize: 12 }}>{hint}</Text> : null}
      </View>
      <View
        style={[
          styles.radio,
          { borderColor: active ? colors.primary : colors.borderStrong },
        ]}
      >
        {active ? <View style={styles.radioDot} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 22, fontWeight: '700', color: colors.text },
  subtitle: { color: colors.textMuted, marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  msg: { color: colors.textMuted, fontSize: 12, marginTop: 8 },
  errorBox: {
    marginTop: 12,
    backgroundColor: colors.dangerSoft,
    padding: 10,
    borderRadius: 6,
    gap: 8,
  },
  errorText: { color: colors.danger, fontSize: 13 },
  help: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
});
