export const theme = {
  colors: {
    backgroundTop: '#090B13',
    backgroundBottom: '#151B2F',
    panel: 'rgba(13, 17, 31, 0.88)',
    panelBorder: 'rgba(111, 119, 203, 0.3)',
    primary: '#B8A0FF',
    primaryStrong: '#8D76FF',
    accent: '#4AF8E3',
    text: '#F6F4FF',
    textMuted: '#A0A6C0',
    danger: '#FF7A90',
    success: '#73F0CD',
    track: '#22283D',
    card: '#12182A',
    overlay: 'rgba(5, 7, 14, 0.72)',

    rarityCommon: '#9CA3AF',
    rarityUncommon: '#22D3EE',
    rarityRare: '#3B82F6',
    rarityEpic: '#A855F7',
    rarityLegendary: '#FFD700',
  },
  radius: {
    lg: 24,
    md: 18,
    sm: 12,
    pill: 999,
  },
  spacing: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
  },
};

// Spark Arena-inspired tokens — used only by the home screen redesign.
// Source: spark-arena.com/ design extract, recolored from green (#76b900) to red (#dc2626).
export const sparkTheme = {
  colors: {
    bg: '#000000',
    bgElevated: '#090a0a',
    bgGradientTop: '#0a0000',
    bgGradientBottom: '#000000',
    border: '#262626',
    borderHover: '#404040',
    textPrimary: '#fbfbfb',
    textSecondary: '#d4d4d4',
    textMuted: '#a3a3a3',
    textDim: '#737373',
    brand: '#dc2626',
    brandHover: 'rgba(220, 38, 38, 0.9)',
    brandSoft: 'rgba(220, 38, 38, 0.05)',
    brandSoftHover: 'rgba(220, 38, 38, 0.3)',
    brandBorder: 'rgba(220, 38, 38, 0.5)',
  },
  radius: { sm: 8, md: 12, lg: 16, pill: 9999 },
  spacing: { 1: 4, 2: 6, 3: 8, 4: 12, 5: 16, 6: 20, 7: 24, 8: 32 },
  shadow: {
    brand: {
      shadowColor: '#dc2626',
      shadowOpacity: 0.2,
      shadowRadius: 15,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
  },
  type: {
    h1: { fontSize: 40, lineHeight: 48, fontWeight: '700' as const },
    h3: { fontSize: 20, lineHeight: 28, fontWeight: '700' as const },
    body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
    small: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
    micro: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '400' as const,
      letterSpacing: 0.3,
    },
  },
  motion: {
    fast: 150,
    haze: 8000,
    stars: 20000,
  },
};
