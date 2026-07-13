import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card } from '../../src/components/Card';
import { Chip } from '../../src/components/Chip';
import { Screen } from '../../src/components/Screen';
import { listMachinery } from '../../src/db/repos';
import type { Machinery } from '../../src/api/fuelStation';
import { colors, radius } from '../../src/theme';
import { formatNumber } from '../../src/utils/format';

export default function MaquinasScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<Machinery[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | 'ATIVO' | 'MANUTENCAO' | 'INATIVO'>('all');

  const load = useCallback(async () => {
    setRows(await listMachinery());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const stats = useMemo(() => {
    const total = rows.length;
    const ativo = rows.filter((r) => r.status === 'ATIVO').length;
    const manut = rows.filter((r) => r.status === 'MANUTENCAO').length;
    const inativo = rows.filter((r) => r.status === 'INATIVO').length;
    return { total, ativo, manut, inativo };
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== 'all' && r.status !== status) return false;
      if (!needle) return true;
      return (
        r.name.toLowerCase().includes(needle) ||
        r.tag.toLowerCase().includes(needle) ||
        (r.erpExternalId ?? '').toLowerCase().includes(needle)
      );
    });
  }, [rows, q, status]);

  return (
    <Screen>
      <View style={styles.statsRow}>
        <StatChip label="Total" value={stats.total} tone="info" />
        <StatChip label="Ativas" value={stats.ativo} tone="success" />
        <StatChip label="Manut." value={stats.manut} tone="warning" />
        <StatChip label="Inativas" value={stats.inativo} tone="danger" />
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={colors.textMuted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Buscar por tag, nome ou QR..."
          placeholderTextColor={colors.textSubtle}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.filterRow}>
        {(
          [
            { v: 'all', l: 'Todos' },
            { v: 'ATIVO', l: 'Ativas' },
            { v: 'MANUTENCAO', l: 'Manutenção' },
            { v: 'INATIVO', l: 'Inativas' },
          ] as const
        ).map((f) => (
          <Chip
            key={f.v}
            label={f.l}
            compact
            selected={status === f.v}
            onPress={() => setStatus(f.v)}
          />
        ))}
      </View>

      <View style={{ gap: 10, marginTop: 10 }}>
        {filtered.length === 0 && (
          <Card>
            <Text style={{ color: colors.textMuted }}>Nenhuma máquina encontrada.</Text>
          </Card>
        )}
        {filtered.map((m) => (
          <Pressable
            key={m.id}
            onPress={() =>
              router.push({
                pathname: '/abastecer/form',
                params: { machineryId: m.id },
              })
            }
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          >
            <Card>
              <View style={styles.cardRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    <Text style={styles.tag}>#{m.tag}</Text>
                    <Chip
                      label={statusLabel(m.status)}
                      tone={statusTone(m.status)}
                      compact
                      selected
                    />
                  </View>
                  <Text style={styles.name}>{m.name}</Text>
                  <Text style={styles.helper}>
                    {m.category ? `${m.category} · ` : ''}
                    {m.hourMeter
                      ? `${formatNumber(m.hourMeter, 1)} h`
                      : m.odometerKm
                        ? `${formatNumber(m.odometerKm, 0)} km`
                        : 'sem leitura'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" color={colors.textMuted} size={18} />
              </View>
            </Card>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

function StatChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'info' | 'success' | 'warning' | 'danger';
}) {
  const bg = {
    info: colors.infoSoft,
    success: colors.successSoft,
    warning: colors.warningSoft,
    danger: colors.dangerSoft,
  }[tone];
  const fg = {
    info: colors.info,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
  }[tone];
  return (
    <View style={[styles.stat, { backgroundColor: bg }]}>
      <Text style={[styles.statValue, { color: fg }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: fg }]}>{label}</Text>
    </View>
  );
}

function statusLabel(s?: string | null): string {
  if (s === 'ATIVO') return 'Ativa';
  if (s === 'MANUTENCAO') return 'Manutenção';
  if (s === 'INATIVO') return 'Inativa';
  return s ?? 'Desconhecido';
}
function statusTone(s?: string | null): 'success' | 'warning' | 'danger' | 'info' {
  if (s === 'ATIVO') return 'success';
  if (s === 'MANUTENCAO') return 'warning';
  if (s === 'INATIVO') return 'danger';
  return 'info';
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: 8 },
  stat: {
    flex: 1,
    padding: 10,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '600' },
  searchWrap: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 10,
  },
  searchInput: { flex: 1, paddingVertical: 10, color: colors.text },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tag: { color: colors.primaryHover, fontWeight: '700', fontSize: 13 },
  name: { fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 2 },
  helper: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
});
