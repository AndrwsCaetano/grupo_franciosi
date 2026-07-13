import React from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';

interface Props {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

export function Screen({ children, scroll = true, padded = true, style, contentStyle }: Props) {
  const inner = (
    <View
      style={[styles.content, padded && styles.padded, contentStyle]}
    >
      {children}
    </View>
  );
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safe, style]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, backgroundColor: colors.bg },
  padded: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
});
