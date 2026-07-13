export const colors = {
  bg: '#FFFFFF',
  bgAlt: '#F7F9FC',
  surface: '#FFFFFF',
  border: '#E5EAF0',
  borderStrong: '#CBD5E1',

  primary: '#3B82F6',
  primaryHover: '#2563EB',
  primarySoft: '#DBEAFE',
  onPrimary: '#FFFFFF',

  text: '#0F172A',
  textMuted: '#64748B',
  textSubtle: '#94A3B8',

  success: '#16A34A',
  successSoft: '#DCFCE7',
  warning: '#D97706',
  warningSoft: '#FEF3C7',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  info: '#0284C7',
  infoSoft: '#E0F2FE',
} as const;

export const radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  pill: 999,
} as const;

export const spacing = (n: number) => n * 4;

export const shadow = {
  card: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
} as const;

export const typography = {
  h1: { fontSize: 24, fontWeight: '700' as const, color: colors.text },
  h2: { fontSize: 20, fontWeight: '700' as const, color: colors.text },
  h3: { fontSize: 16, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 14, color: colors.text },
  bodyMuted: { fontSize: 14, color: colors.textMuted },
  small: { fontSize: 12, color: colors.textMuted },
} as const;
