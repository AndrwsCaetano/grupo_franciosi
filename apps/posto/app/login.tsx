import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '../src/components/Button';
import { Field } from '../src/components/Field';
import { Screen } from '../src/components/Screen';
import { useAuth } from '../src/context/AuthContext';
import { colors } from '../src/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!email || !password) {
      setError('Informe email e senha.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace('/bootstrap');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao entrar';
      setError(mapError(msg));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll={false} padded={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.wrap}
      >
        <View style={styles.brandWrap}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>NA</Text>
          </View>
          <Text style={styles.title}>New Agrigestão</Text>
          <Text style={styles.subtitle}>Ponto de Abastecimento</Text>
        </View>

        <View style={styles.form}>
          <Field
            label="E-mail"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="operador@empresa.com"
          />
          <Field
            label="Senha"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            title="Entrar"
            onPress={submit}
            loading={loading}
            size="lg"
            fullWidth
          />
          <Text style={styles.hint}>
            Requer usuário com permissão “fuel_station.operate”. Configure a URL
            da API em Configurações caso o servidor não seja o padrão.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function mapError(msg: string): string {
  if (/timeout|network|failed to fetch/i.test(msg)) {
    return 'Não foi possível contactar a API. Verifique conexão e URL configurada.';
  }
  if (/401|unauthor/i.test(msg)) return 'E-mail ou senha inválidos.';
  return msg;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, padding: 20, justifyContent: 'center' },
  brandWrap: { alignItems: 'center', marginBottom: 32 },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoText: { color: '#fff', fontSize: 24, fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  form: { gap: 14 },
  error: { color: colors.danger, fontSize: 13 },
  hint: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 8 },
});
