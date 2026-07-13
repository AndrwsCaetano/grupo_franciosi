import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { useSession } from '../src/context/SessionContext';
import { colors } from '../src/theme';

export default function GateScreen() {
  const { loading, isAuthenticated } = useAuth();
  const session = useSession();

  if (loading || session.loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!isAuthenticated) return <Redirect href="/login" />;
  if (!session.lastBootstrapAt || !session.point) return <Redirect href="/bootstrap" />;
  return <Redirect href="/(tabs)/dashboard" />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
