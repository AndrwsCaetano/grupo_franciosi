import React, { useEffect, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, View } from 'react-native';
import {
  getApiBaseUrl,
  getDefaultApiBaseUrl,
  normalizeApiUrl,
  switchServer,
  testApiConnection,
  type ConnectionTestResult,
} from '../config';
import { countByStatus } from '../db/queue';
import { colors, radius } from '../theme';
import { Button } from './Button';
import { Field } from './Field';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Chamado após a troca efetiva de servidor (tokens/cache/fila já limpos). */
  onServerSwitched?: () => void | Promise<void>;
}

/**
 * Modal "Servidor": permite apontar o mesmo APK para outra instância da API
 * (multi-projeto). Trocar de servidor limpa sessão, cache offline e fila.
 */
export function ServerConfigModal({ visible, onClose, onServerSwitched }: Props) {
  const [url, setUrl] = useState(getApiBaseUrl());
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ConnectionTestResult | null>(null);

  useEffect(() => {
    if (visible) {
      setUrl(getApiBaseUrl());
      setResult(null);
    }
  }, [visible]);

  async function runTest() {
    const normalized = normalizeApiUrl(url);
    if (!normalized) {
      setResult({ ok: false, message: 'URL inválida.' });
      return;
    }
    setTesting(true);
    setResult(null);
    try {
      setResult(await testApiConnection(normalized));
    } finally {
      setTesting(false);
    }
  }

  async function save() {
    const normalized = normalizeApiUrl(url);
    if (!normalized) {
      setResult({ ok: false, message: 'URL inválida.' });
      return;
    }
    if (normalized === getApiBaseUrl()) {
      onClose();
      return;
    }
    const counts = await countByStatus();
    const pendentes = counts.pending + counts.syncing + counts.error;
    const warning =
      pendentes > 0
        ? `Existem ${pendentes} apontamento(s) pendentes de sincronização que serão PERDIDOS.\n\n`
        : '';
    Alert.alert(
      'Trocar servidor',
      `${warning}A sessão será encerrada e os dados locais deste servidor serão apagados. Continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Trocar',
          style: 'destructive',
          onPress: () => void doSwitch(normalized),
        },
      ],
    );
  }

  async function doSwitch(normalized: string) {
    setSaving(true);
    try {
      await switchServer(normalized);
      onClose();
      await onServerSwitched?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Servidor</Text>
          <Text style={styles.subtitle}>
            Aponte o app para a API do projeto desejado. Trocar de servidor
            limpa a sessão e os dados offline deste dispositivo.
          </Text>

          <Field
            label="URL da API"
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder={getDefaultApiBaseUrl()}
          />

          {result ? (
            <Text style={[styles.result, { color: result.ok ? colors.success : colors.danger }]}>
              {result.message}
            </Text>
          ) : null}

          <View style={styles.row}>
            <Button
              title="Testar conexão"
              variant="secondary"
              onPress={runTest}
              loading={testing}
            />
            <Button
              title="Restaurar padrão"
              variant="ghost"
              onPress={() => {
                setUrl(getDefaultApiBaseUrl());
                setResult(null);
              }}
            />
          </View>

          <View style={styles.footer}>
            <Button title="Cancelar" variant="ghost" onPress={onClose} />
            <Button title="Salvar" onPress={save} loading={saving} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: 20,
    gap: 12,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted },
  result: { fontSize: 13 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
});
