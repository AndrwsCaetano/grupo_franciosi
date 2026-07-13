import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { colors, radius } from '../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'sm' | 'lg';

interface Props {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  fullWidth,
  style,
  textStyle,
  icon,
}: Props) {
  const s = getStyles(variant, size, disabled || loading);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.base,
        fullWidth && { alignSelf: 'stretch' },
        pressed && !disabled && s.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={s.textColor} />
      ) : (
        <>
          {icon}
          <Text style={[s.text, textStyle]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

function getStyles(variant: Variant, size: Size, disabled?: boolean) {
  const pad = size === 'lg' ? 16 : size === 'sm' ? 8 : 12;
  const fontSize = size === 'lg' ? 16 : size === 'sm' ? 13 : 14;

  const palette = {
    primary: { bg: colors.primary, text: colors.onPrimary, border: colors.primary },
    secondary: { bg: colors.primarySoft, text: colors.primaryHover, border: colors.primarySoft },
    ghost: { bg: 'transparent', text: colors.primaryHover, border: colors.border },
    danger: { bg: colors.danger, text: '#fff', border: colors.danger },
  }[variant];

  const base: ViewStyle = {
    backgroundColor: disabled ? '#CBD5E1' : palette.bg,
    borderColor: disabled ? '#CBD5E1' : palette.border,
    borderWidth: variant === 'ghost' ? 1 : 0,
    borderRadius: radius.md,
    paddingVertical: pad,
    paddingHorizontal: pad + 4,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  };
  const text: TextStyle = {
    color: disabled ? '#F8FAFC' : palette.text,
    fontWeight: '600',
    fontSize,
  };
  return {
    base,
    text,
    textColor: palette.text,
    pressed: { opacity: 0.85 } satisfies ViewStyle,
  };
}
