import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export type StockStatus = 'ok' | 'reserva' | 'critico' | 'esgotado';

export function classifyStock(qty: number, min = 0, capacity = 0): StockStatus {
  if (qty <= 0) return 'esgotado';
  if (min > 0 && qty <= min * 0.5) return 'critico';
  if (min > 0 && qty <= min) return 'reserva';
  return 'ok';
}

export function labelForStatus(s: StockStatus): string {
  switch (s) {
    case 'ok':
      return 'Disponível';
    case 'reserva':
      return 'Em reserva';
    case 'critico':
      return 'Crítico';
    case 'esgotado':
      return 'Esgotado';
  }
}

export function colorForStatus(s: StockStatus): string {
  switch (s) {
    case 'ok':
      return colors.success;
    case 'reserva':
      return colors.warning;
    case 'critico':
      return colors.warning;
    case 'esgotado':
      return colors.danger;
  }
}

export function StatusDot({ status, label }: { status: StockStatus; label?: boolean }) {
  const c = colorForStatus(status);
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: c }]} />
      {label && <Text style={[styles.text, { color: c }]}>{labelForStatus(status)}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { fontSize: 12, fontWeight: '600' },
});
