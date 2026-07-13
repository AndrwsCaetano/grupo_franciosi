import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';

interface Props {
  value: number;
  max: number;
  color?: string;
}

export function ProgressBar({ value, max, color = colors.primary }: Props) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    backgroundColor: colors.bgAlt,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: { height: '100%' },
});
