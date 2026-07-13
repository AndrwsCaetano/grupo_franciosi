import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Field } from '../../src/components/Field';
import { Screen } from '../../src/components/Screen';
import { findMachineryByQr, listMachinery } from '../../src/db/repos';
import { colors, radius } from '../../src/theme';

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const scannedRef = useRef(false);

  const isWeb = Platform.OS === 'web';

  const handleCode = useCallback(
    async (code: string) => {
      if (busy) return;
      setBusy(true);
      setError(null);
      try {
        const m = await findMachineryByQr(code.trim());
        if (!m) {
          setError(
            `Nenhuma máquina encontrada para o código "${code.trim()}". Verifique se o cadastro foi sincronizado.`,
          );
          scannedRef.current = false;
          return;
        }
        router.replace({
          pathname: '/abastecer/form',
          params: { machineryId: m.id },
        });
      } finally {
        setBusy(false);
      }
    },
    [busy, router],
  );

  async function simulate() {
    const list = await listMachinery();
    if (list.length === 0) {
      setError('Sem máquinas locais. Sincronize antes de simular.');
      return;
    }
    const target = list.find((m) => m.status === 'ATIVO') ?? list[0];
    await handleCode(target.erpExternalId ?? target.tag);
  }

  return (
    <Screen padded={false} scroll={false}>
      <View style={{ flex: 1 }}>
        <View style={styles.cameraWrap}>
          {isWeb ? (
            <View style={styles.cameraFallback}>
              <Ionicons name="camera-outline" size={36} color={colors.textMuted} />
              <Text style={styles.fallbackText}>
                Câmera não é suportada no navegador. Use o app nativo ou informe o código manualmente.
              </Text>
            </View>
          ) : !permission ? (
            <View style={styles.cameraFallback}>
              <Text style={styles.fallbackText}>Preparando câmera...</Text>
            </View>
          ) : !permission.granted ? (
            <View style={styles.cameraFallback}>
              <Ionicons name="lock-closed-outline" size={36} color={colors.textMuted} />
              <Text style={styles.fallbackText}>
                Precisamos da câmera para ler QR Codes das máquinas.
              </Text>
              <Button title="Permitir câmera" onPress={requestPermission} />
            </View>
          ) : (
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={(evt) => {
                if (scannedRef.current) return;
                if (!evt?.data) return;
                scannedRef.current = true;
                void handleCode(String(evt.data));
              }}
            />
          )}
          <View pointerEvents="none" style={styles.overlay}>
            <View style={styles.marker} />
            <Text style={styles.overlayText}>
              Aponte a câmera para o QR Code fixado na máquina
            </Text>
          </View>
        </View>

        <View style={styles.panel}>
          <Card>
            <Field
              label="Informar tag manualmente"
              placeholder="Ex.: TRAT-042"
              autoCapitalize="characters"
              value={manualCode}
              onChangeText={setManualCode}
              onSubmitEditing={() => manualCode && handleCode(manualCode)}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Button
                title="Buscar"
                onPress={() => manualCode && handleCode(manualCode)}
                disabled={!manualCode.trim() || busy}
              />
              <Button title="Simular QR" variant="ghost" onPress={simulate} disabled={busy} />
              <Pressable onPress={() => router.back()} style={styles.cancel}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
            </View>
          </Card>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cameraWrap: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 20,
    backgroundColor: colors.bgAlt,
  },
  fallbackText: { color: colors.textMuted, textAlign: 'center' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  marker: {
    width: 220,
    height: 220,
    borderColor: colors.primary,
    borderWidth: 3,
    borderRadius: radius.md,
  },
  overlayText: {
    color: '#fff',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    fontSize: 12,
  },
  panel: { padding: 16, backgroundColor: colors.bg },
  error: { color: colors.danger, fontSize: 12, marginTop: 8 },
  cancel: {
    justifyContent: 'center',
    paddingHorizontal: 8,
    marginLeft: 'auto',
  },
  cancelText: { color: colors.textMuted, fontWeight: '600' },
});
