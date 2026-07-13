import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, radius } from '../theme';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  compact?: boolean;
  style?: ViewStyle;
}

export function Chip({ label, selected, onPress, tone = 'default', compact, style }: Props) {
  const palette = getPalette(tone, selected);
  const paddingV = compact ? 4 : 6;
  const paddingH = compact ? 8 : 10;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          paddingVertical: paddingV,
          paddingHorizontal: paddingH,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { color: palette.text, fontSize: compact ? 11 : 12 }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function getPalette(tone: NonNullable<Props['tone']>, selected?: boolean) {
  const activeMap = {
    default: { bg: colors.primary, text: colors.onPrimary, border: colors.primary },
    success: { bg: colors.success, text: '#fff', border: colors.success },
    warning: { bg: colors.warning, text: '#fff', border: colors.warning },
    danger: { bg: colors.danger, text: '#fff', border: colors.danger },
    info: { bg: colors.info, text: '#fff', border: colors.info },
  } as const;
  const idleMap = {
    default: { bg: colors.bgAlt, text: colors.text, border: colors.border },
    success: { bg: colors.successSoft, text: colors.success, border: colors.successSoft },
    warning: { bg: colors.warningSoft, text: colors.warning, border: colors.warningSoft },
    danger: { bg: colors.dangerSoft, text: colors.danger, border: colors.dangerSoft },
    info: { bg: colors.infoSoft, text: colors.info, border: colors.infoSoft },
  } as const;
  return selected ? activeMap[tone] : idleMap[tone];
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: { fontWeight: '600' },
});
