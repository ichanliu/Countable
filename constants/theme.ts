export const Colors = {
  background: '#080C14',
  foreground: '#FFFFFF',
  card: '#0F1520',
  cardForeground: '#FFFFFF',
  primary: '#5B9EFF',
  primaryForeground: '#FFFFFF',
  secondary: '#182030',
  secondaryForeground: '#FFFFFF',
  muted: '#182030',
  mutedForeground: '#7A8A9E',
  accent: '#FF6B35',
  border: '#1E2D40',
  input: '#1E2D40',
  destructive: '#EF4444',
  countdown: '#5B9EFF',
  countup: '#FF6B35',
  today: '#2ECC71',
  pinnedGold: '#FFD700',
  pinnedBg: 'rgba(255,215,0,0.25)',
};

export const Gradients = {
  future: ['#0D1B2E', '#142444'] as const,
  past: ['#2E1A0D', '#3A2010'] as const,
  today: ['#0D2E1A', '#14441F'] as const,
  overlay: ['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.85)'] as const,
};

export const Radius = {
  card: 16,
  badge: 12,
  section: 14,
  pill: 100,
};

export const InterWeights = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;
