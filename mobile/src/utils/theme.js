/**
 * Corridoor Mobile Theme
 * Brand colors and typography constants.
 */

export const COLORS = {
  // Brand
  primary: '#FF461A',
  primaryDark: '#E63D15',
  primaryLight: '#FF6B47',
  cream: '#FFF9E1',
  creamDark: '#F5EDD3',

  // Backgrounds
  bgPrimary: '#FFFFFF',
  bgSecondary: '#FAFAF8',
  bgTertiary: '#F5F3EF',

  // Text
  textPrimary: '#1A1A1A',
  textSecondary: '#5C5C5C',
  textTertiary: '#8C8C8C',
  textInverse: '#FFFFFF',

  // Semantic
  hazard: '#DC2626',
  hazardBg: '#FEF2F2',
  success: '#059669',
  successBg: '#ECFDF5',
  warning: '#D97706',
  warningBg: '#FFFBEB',
  active: '#2563EB',

  // Borders
  border: '#E8E4DC',
  borderLight: '#F0EDE7',

  // Misc
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.5)',
};

export const FONTS = {
  regular: { fontSize: 15, color: COLORS.textPrimary },
  small: { fontSize: 13, color: COLORS.textSecondary },
  tiny: { fontSize: 11, color: COLORS.textTertiary },
  heading: { fontSize: 24, fontWeight: '700', color: COLORS.textPrimary },
  subheading: { fontSize: 18, fontWeight: '600', color: COLORS.textPrimary },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  mono: { fontSize: 13, fontFamily: 'monospace', color: COLORS.primary },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};