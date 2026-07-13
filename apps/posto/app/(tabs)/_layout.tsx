import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useSession } from '../../src/context/SessionContext';
import { useSync } from '../../src/context/SyncContext';
import { colors } from '../../src/theme';

export default function TabsLayout() {
  const { loading, isAuthenticated } = useAuth();
  const session = useSession();
  const sync = useSync();

  if (loading || session.loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!isAuthenticated) return <Redirect href="/login" />;
  if (!session.point) return <Redirect href="/bootstrap" />;

  const pendingBadge = sync.counts.pending + sync.counts.error + sync.counts.syncing;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        headerTintColor: colors.primary,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} color={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="estoque"
        options={{
          title: 'Estoque',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'cube' : 'cube-outline'} color={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="maquinas"
        options={{
          title: 'Máquinas',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'construct' : 'construct-outline'}
              color={color}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="transfers"
        options={{
          title: 'Transferências',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'swap-horizontal' : 'swap-horizontal-outline'}
              color={color}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="fila"
        options={{
          title: 'Fila',
          tabBarBadge: pendingBadge > 0 ? pendingBadge : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.warning,
            color: '#fff',
            fontSize: 10,
          },
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'cloud-upload' : 'cloud-upload-outline'}
              color={color}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="config"
        options={{
          title: 'Config',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'settings' : 'settings-outline'}
              color={color}
              size={22}
            />
          ),
        }}
      />
    </Tabs>
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
