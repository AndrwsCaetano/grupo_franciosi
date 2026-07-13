import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { colors, radius } from '../theme';

interface Props extends TextInputProps {
  label: string;
  error?: string | null;
  helper?: string;
  containerStyle?: ViewStyle;
}

export function Field({ label, error, helper, containerStyle, style, ...rest }: Props) {
  return (
    <View style={[styles.wrap, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textSubtle}
        {...rest}
        style={[styles.input, error ? styles.inputError : null, style]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : helper ? (
        <Text style={styles.helper}>{helper}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    fontSize: 15,
  },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 12 },
  helper: { color: colors.textMuted, fontSize: 12 },
});
