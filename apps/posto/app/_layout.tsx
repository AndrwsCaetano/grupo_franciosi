import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/context/AuthContext';
import { SessionProvider } from '../src/context/SessionContext';
import { SyncProvider } from '../src/context/SyncContext';
import { getDb } from '../src/db';
import { loadApiBaseUrl } from '../src/config';
import { colors } from '../src/theme';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await loadApiBaseUrl();
      await getDb();
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <AuthProvider>
          <SessionProvider>
            <SyncProvider>
              <StatusBar style="dark" />
              <Stack
                screenOptions={{
                  headerStyle: { backgroundColor: colors.bg },
                  headerTitleStyle: { color: colors.text, fontWeight: '600' },
                  headerTintColor: colors.primary,
                  contentStyle: { backgroundColor: colors.bg },
                }}
              >
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="login" options={{ headerShown: false }} />
                <Stack.Screen name="bootstrap" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="abastecer/scan"
                  options={{ title: 'Ler QR Code' }}
                />
                <Stack.Screen
                  name="abastecer/form"
                  options={{ title: 'Novo abastecimento' }}
                />
                <Stack.Screen
                  name="transfers/new"
                  options={{ title: 'Solicitar transferência' }}
                />
                <Stack.Screen
                  name="transfers/[id]"
                  options={{ title: 'Transferência' }}
                />
              </Stack>
            </SyncProvider>
          </SessionProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
