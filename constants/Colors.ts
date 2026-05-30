// ============================================================
// Premium Color Palette 2025
// Professional · Harmonious · Hermes-Safe
// 10 Light Themes + 9 Dark Themes
// ============================================================

// ============================================================
// FALLBACK THEME — dùng khi mọi thứ fail, không bao giờ crash
// ============================================================
const FALLBACK_THEME: Record<string, any> = {
  text: '#1A2840',
  background: '#F4F8FD',
  surface: 'rgba(255, 255, 255, 0.94)',
  tint: '#3B7DD8',
  tintLight: '#6FA3E8',
  tintDark: '#205FB2',
  icon: '#3B7DD8',
  subtleText: 'rgba(24, 40, 64, 0.54)',
  border: '#D8EAF8',
  gradientBackground: ['#F4F8FD', '#E8F2FB', '#EFF5FC'],
  gradientPrimary: ['#3B7DD8', '#6FA3E8'],
  gradientCard: ['rgba(255, 255, 255, 0.94)', 'rgba(232, 242, 251, 0.75)'],
  glowTop: ['rgba(59, 125, 216, 0.12)', 'rgba(59, 125, 216, 0)'],
  glowBottom: ['rgba(111, 163, 232, 0.08)', 'rgba(111, 163, 232, 0)'],
  menuBackground: 'rgba(250, 253, 255, 0.97)',
  menuBorder: 'rgba(59, 125, 216, 0.26)',
};

// ============================================================
// LIGHT THEMES (màu tươi, cá tính)
// ============================================================

const pearl = {
  text: '#2B2418',
  background: '#FFF9F0',
  surface: 'rgba(255, 255, 255, 0.97)',
  tint: '#B8860B',
  tintLight: '#DAA520',
  tintDark: '#8B6508',
  icon: '#B8860B',
  subtleText: 'rgba(43, 36, 24, 0.62)',
  border: '#F0E0C8',
  gradientBackground: ['#FFF9F0', '#FDF3E2', '#FFF7EE'],
  gradientPrimary: ['#B8860B', '#DAA520'],
  gradientCard: ['rgba(255, 255, 255, 0.97)', 'rgba(253, 243, 226, 0.84)'],
  glowTop: ['rgba(184, 134, 11, 0.16)', 'rgba(184, 134, 11, 0)'],
  glowBottom: ['rgba(218, 165, 32, 0.12)', 'rgba(218, 165, 32, 0)'],
  menuBackground: 'rgba(255, 251, 243, 0.98)',
  menuBorder: 'rgba(184, 134, 11, 0.30)',
};

const ivory = {
  text: '#1E3A28',
  background: '#F6F9F2',
  surface: 'rgba(255, 255, 255, 0.96)',
  tint: '#4A7C59',
  tintLight: '#7C9F6E',
  tintDark: '#2F5A3C',
  icon: '#4A7C59',
  subtleText: 'rgba(30, 58, 40, 0.64)',
  border: '#D9E8D5',
  gradientBackground: ['#F6F9F2', '#EEF5EA', '#F4F8F0'],
  gradientPrimary: ['#4A7C59', '#7C9F6E'],
  gradientCard: ['rgba(255, 255, 255, 0.96)', 'rgba(238, 245, 234, 0.80)'],
  glowTop: ['rgba(74, 124, 89, 0.14)', 'rgba(74, 124, 89, 0)'],
  glowBottom: ['rgba(124, 159, 110, 0.10)', 'rgba(124, 159, 110, 0)'],
  menuBackground: 'rgba(250, 253, 248, 0.98)',
  menuBorder: 'rgba(74, 124, 89, 0.28)',
};

const cloud = {
  text: '#112240',
  background: '#F4F9FF',
  surface: 'rgba(255, 255, 255, 0.97)',
  tint: '#1E6DF2',
  tintLight: '#4D8EF7',
  tintDark: '#0F4FC2',
  icon: '#1E6DF2',
  subtleText: 'rgba(17, 34, 64, 0.62)',
  border: '#D8E9FC',
  gradientBackground: ['#F4F9FF', '#EAF3FF', '#F0F7FF'],
  gradientPrimary: ['#1E6DF2', '#4D8EF7'],
  gradientCard: ['rgba(255, 255, 255, 0.97)', 'rgba(234, 243, 255, 0.82)'],
  glowTop: ['rgba(30, 109, 242, 0.14)', 'rgba(30, 109, 242, 0)'],
  glowBottom: ['rgba(77, 142, 247, 0.10)', 'rgba(77, 142, 247, 0)'],
  menuBackground: 'rgba(250, 253, 255, 0.98)',
  menuBorder: 'rgba(30, 109, 242, 0.28)',
};

const lavender = {
  text: '#2D1B4E',
  background: '#F8F6FF',
  surface: 'rgba(255, 255, 255, 0.97)',
  tint: '#7C3AED',
  tintLight: '#A78BFA',
  tintDark: '#5B21B6',
  icon: '#7C3AED',
  subtleText: 'rgba(45, 27, 78, 0.64)',
  border: '#EDE9FE',
  gradientBackground: ['#F8F6FF', '#F0EBFF', '#F5F2FF'],
  gradientPrimary: ['#7C3AED', '#A78BFA'],
  gradientCard: ['rgba(255, 255, 255, 0.97)', 'rgba(240, 235, 255, 0.82)'],
  glowTop: ['rgba(124, 58, 237, 0.16)', 'rgba(124, 58, 237, 0)'],
  glowBottom: ['rgba(167, 139, 250, 0.12)', 'rgba(167, 139, 250, 0)'],
  menuBackground: 'rgba(253, 251, 255, 0.98)',
  menuBorder: 'rgba(124, 58, 237, 0.30)',
};

const sand = {
  text: '#4A2A1A',
  background: '#FDF6F0',
  surface: 'rgba(255, 255, 255, 0.97)',
  tint: '#D9703A',
  tintLight: '#ED9460',
  tintDark: '#B84D22',
  icon: '#D9703A',
  subtleText: 'rgba(74, 42, 26, 0.64)',
  border: '#F2D9C8',
  gradientBackground: ['#FDF6F0', '#F9EBE0', '#FCF3EC'],
  gradientPrimary: ['#D9703A', '#ED9460'],
  gradientCard: ['rgba(255, 255, 255, 0.97)', 'rgba(249, 235, 224, 0.84)'],
  glowTop: ['rgba(217, 112, 58, 0.16)', 'rgba(217, 112, 58, 0)'],
  glowBottom: ['rgba(237, 148, 96, 0.12)', 'rgba(237, 148, 96, 0)'],
  menuBackground: 'rgba(255, 252, 249, 0.98)',
  menuBorder: 'rgba(217, 112, 58, 0.30)',
};

const prism = {
  text: '#0F2E44',
  background: '#F5FBFC',
  surface: 'rgba(255, 255, 255, 0.97)',
  tint: '#0D9488',
  tintLight: '#F43F5E',
  tintDark: '#0F766E',
  icon: '#0D9488',
  subtleText: 'rgba(15, 46, 68, 0.62)',
  border: '#D2EBEE',
  gradientBackground: ['#F5FBFC', '#EAF6F8', '#FFF5F5'],
  gradientPrimary: ['#0D9488', '#F43F5E'],
  gradientCard: ['rgba(255, 255, 255, 0.97)', 'rgba(234, 246, 248, 0.82)'],
  glowTop: ['rgba(13, 148, 136, 0.16)', 'rgba(13, 148, 136, 0)'],
  glowBottom: ['rgba(244, 63, 94, 0.12)', 'rgba(244, 63, 94, 0)'],
  menuBackground: 'rgba(251, 254, 254, 0.98)',
  menuBorder: 'rgba(13, 148, 136, 0.30)',
};

const orchard = {
  text: '#1A3225',
  background: '#F5FBF4',
  surface: 'rgba(255, 255, 255, 0.97)',
  tint: '#2D6A4F',
  tintLight: '#E6A23C',
  tintDark: '#1B4332',
  icon: '#2D6A4F',
  subtleText: 'rgba(26, 50, 37, 0.64)',
  border: '#DAEDD5',
  gradientBackground: ['#F5FBF4', '#EDF7E9', '#FFF8EC'],
  gradientPrimary: ['#2D6A4F', '#E6A23C'],
  gradientCard: ['rgba(255, 255, 255, 0.97)', 'rgba(237, 247, 233, 0.82)'],
  glowTop: ['rgba(45, 106, 79, 0.14)', 'rgba(45, 106, 79, 0)'],
  glowBottom: ['rgba(230, 162, 60, 0.10)', 'rgba(230, 162, 60, 0)'],
  menuBackground: 'rgba(251, 254, 248, 0.98)',
  menuBorder: 'rgba(45, 106, 79, 0.28)',
};

const roseQuartz = {
  text: '#4A1C2D',
  background: '#FFF5F7',
  surface: 'rgba(255, 255, 255, 0.97)',
  tint: '#E11D48',
  tintLight: '#FB7185',
  tintDark: '#BE123C',
  icon: '#E11D48',
  subtleText: 'rgba(74, 28, 45, 0.64)',
  border: '#FFD6DF',
  gradientBackground: ['#FFF5F7', '#FFE9EE', '#FFF2F5'],
  gradientPrimary: ['#E11D48', '#FB7185'],
  gradientCard: ['rgba(255, 255, 255, 0.97)', 'rgba(255, 233, 238, 0.84)'],
  glowTop: ['rgba(225, 29, 72, 0.16)', 'rgba(225, 29, 72, 0)'],
  glowBottom: ['rgba(251, 113, 133, 0.12)', 'rgba(251, 113, 133, 0)'],
  menuBackground: 'rgba(255, 249, 250, 0.98)',
  menuBorder: 'rgba(225, 29, 72, 0.30)',
};

const mint = {
  text: '#0A3A2E',
  background: '#F2FCF8',
  surface: 'rgba(255, 255, 255, 0.97)',
  tint: '#059669',
  tintLight: '#34D399',
  tintDark: '#047857',
  icon: '#059669',
  subtleText: 'rgba(10, 58, 46, 0.64)',
  border: '#C6F6D5',
  gradientBackground: ['#F2FCF8', '#E6F9F2', '#EEFDF6'],
  gradientPrimary: ['#059669', '#34D399'],
  gradientCard: ['rgba(255, 255, 255, 0.97)', 'rgba(230, 249, 242, 0.82)'],
  glowTop: ['rgba(5, 150, 105, 0.14)', 'rgba(5, 150, 105, 0)'],
  glowBottom: ['rgba(52, 211, 153, 0.10)', 'rgba(52, 211, 153, 0)'],
  menuBackground: 'rgba(249, 253, 251, 0.98)',
  menuBorder: 'rgba(5, 150, 105, 0.28)',
};

const citrus = {
  text: '#4A2C0A',
  background: '#FFFDF5',
  surface: 'rgba(255, 255, 255, 0.97)',
  tint: '#F59E0B',
  tintLight: '#FBBF24',
  tintDark: '#B45309',
  icon: '#F59E0B',
  subtleText: 'rgba(74, 44, 10, 0.64)',
  border: '#FDE68A',
  gradientBackground: ['#FFFDF5', '#FFF9E0', '#FFFCEF'],
  gradientPrimary: ['#F59E0B', '#FBBF24'],
  gradientCard: ['rgba(255, 255, 255, 0.97)', 'rgba(255, 249, 224, 0.82)'],
  glowTop: ['rgba(245, 158, 11, 0.18)', 'rgba(245, 158, 11, 0)'],
  glowBottom: ['rgba(251, 191, 36, 0.12)', 'rgba(251, 191, 36, 0)'],
  menuBackground: 'rgba(255, 253, 245, 0.98)',
  menuBorder: 'rgba(245, 158, 11, 0.30)',
};

// ============================================================
// DARK THEMES (giữ nguyên, chỉ cần copy lại)
// ============================================================
const obsidian = {
  text: '#EAEAED',
  background: '#080808',
  surface: 'rgba(18, 18, 20, 0.84)',
  tint: '#B0B0BC',
  tintLight: '#D0D0DC',
  tintDark: '#787882',
  icon: '#D0D0DC',
  subtleText: 'rgba(234, 234, 237, 0.52)',
  border: '#1A1A1C',
  gradientBackground: ['#080808', '#0E0E10', '#0A0A0C'],
  gradientPrimary: ['#787882', '#C8C8D6'],
  gradientCard: ['rgba(18, 18, 20, 0.84)', 'rgba(10, 10, 12, 0.64)'],
  glowTop: ['rgba(208, 208, 220, 0.14)', 'rgba(208, 208, 220, 0)'],
  glowBottom: ['rgba(120, 120, 130, 0.10)', 'rgba(120, 120, 130, 0)'],
  menuBackground: 'rgba(6, 6, 8, 0.97)',
  menuBorder: 'rgba(176, 176, 188, 0.18)',
};

const sapphire = {
  text: '#D4E6FF',
  background: '#030C1C',
  surface: 'rgba(6, 20, 44, 0.80)',
  tint: '#4F8EF7',
  tintLight: '#79B2F9',
  tintDark: '#2563EB',
  icon: '#4F8EF7',
  subtleText: 'rgba(212, 230, 255, 0.58)',
  border: '#0A1E3C',
  gradientBackground: ['#030C1C', '#061428', '#040F22'],
  gradientPrimary: ['#2563EB', '#4F8EF7'],
  gradientCard: ['rgba(6, 20, 44, 0.80)', 'rgba(3, 10, 28, 0.60)'],
  glowTop: ['rgba(79, 142, 247, 0.22)', 'rgba(79, 142, 247, 0)'],
  glowBottom: ['rgba(37, 99, 235, 0.16)', 'rgba(37, 99, 235, 0)'],
  menuBackground: 'rgba(2, 8, 18, 0.97)',
  menuBorder: 'rgba(79, 142, 247, 0.24)',
};

const amethyst = {
  text: '#E6DCFF',
  background: '#090614',
  surface: 'rgba(16, 10, 32, 0.80)',
  tint: '#9B5DE5',
  tintLight: '#C084FC',
  tintDark: '#6D28D9',
  icon: '#C084FC',
  subtleText: 'rgba(230, 220, 255, 0.56)',
  border: '#14083A',
  gradientBackground: ['#090614', '#0E0820', '#0B0618'],
  gradientPrimary: ['#6D28D9', '#9B5DE5'],
  gradientCard: ['rgba(16, 10, 32, 0.80)', 'rgba(9, 5, 20, 0.60)'],
  glowTop: ['rgba(155, 93, 229, 0.24)', 'rgba(155, 93, 229, 0)'],
  glowBottom: ['rgba(109, 40, 217, 0.18)', 'rgba(109, 40, 217, 0)'],
  menuBackground: 'rgba(7, 4, 14, 0.97)',
  menuBorder: 'rgba(155, 93, 229, 0.25)',
};

const ember = {
  text: '#F5E6C4',
  background: '#0C0908',
  surface: 'rgba(24, 18, 12, 0.80)',
  tint: '#D4A017',
  tintLight: '#EEC048',
  tintDark: '#A07810',
  icon: '#D4A017',
  subtleText: 'rgba(245, 230, 196, 0.56)',
  border: '#221A08',
  gradientBackground: ['#0C0908', '#181208', '#100E06'],
  gradientPrimary: ['#A07810', '#D4A017'],
  gradientCard: ['rgba(24, 18, 12, 0.80)', 'rgba(14, 10, 6, 0.60)'],
  glowTop: ['rgba(212, 160, 23, 0.22)', 'rgba(212, 160, 23, 0)'],
  glowBottom: ['rgba(160, 120, 16, 0.15)', 'rgba(160, 120, 16, 0)'],
  menuBackground: 'rgba(10, 7, 4, 0.97)',
  menuBorder: 'rgba(212, 160, 23, 0.24)',
};

const carbon = {
  text: '#DEF0F6',
  background: '#0C1014',
  surface: 'rgba(18, 26, 34, 0.80)',
  tint: '#06B6D4',
  tintLight: '#22D3EE',
  tintDark: '#0891B2',
  icon: '#06B6D4',
  subtleText: 'rgba(222, 240, 246, 0.56)',
  border: '#182030',
  gradientBackground: ['#0C1014', '#101820', '#0E141C'],
  gradientPrimary: ['#0891B2', '#06B6D4'],
  gradientCard: ['rgba(18, 26, 34, 0.80)', 'rgba(10, 16, 22, 0.60)'],
  glowTop: ['rgba(6, 182, 212, 0.22)', 'rgba(6, 182, 212, 0)'],
  glowBottom: ['rgba(8, 145, 178, 0.15)', 'rgba(8, 145, 178, 0)'],
  menuBackground: 'rgba(8, 11, 15, 0.97)',
  menuBorder: 'rgba(6, 182, 212, 0.24)',
};

const copper = {
  text: '#FFE2C8',
  background: '#0C0806',
  surface: 'rgba(26, 14, 8, 0.80)',
  tint: '#CD7F32',
  tintLight: '#E8A060',
  tintDark: '#9E5C1C',
  icon: '#CD7F32',
  subtleText: 'rgba(255, 226, 200, 0.56)',
  border: '#281408',
  gradientBackground: ['#0C0806', '#180E08', '#100A06'],
  gradientPrimary: ['#9E5C1C', '#CD7F32'],
  gradientCard: ['rgba(26, 14, 8, 0.80)', 'rgba(16, 8, 4, 0.60)'],
  glowTop: ['rgba(205, 127, 50, 0.24)', 'rgba(205, 127, 50, 0)'],
  glowBottom: ['rgba(158, 92, 28, 0.16)', 'rgba(158, 92, 28, 0)'],
  menuBackground: 'rgba(9, 6, 3, 0.97)',
  menuBorder: 'rgba(205, 127, 50, 0.25)',
};

const slate = {
  text: '#CDD9E5',
  background: '#0D1117',
  surface: 'rgba(22, 30, 40, 0.80)',
  tint: '#58A6FF',
  tintLight: '#79B8FF',
  tintDark: '#388BFD',
  icon: '#58A6FF',
  subtleText: 'rgba(205, 217, 229, 0.56)',
  border: '#21282E',
  gradientBackground: ['#0D1117', '#131C26', '#101820'],
  gradientPrimary: ['#388BFD', '#58A6FF'],
  gradientCard: ['rgba(22, 30, 40, 0.80)', 'rgba(12, 18, 28, 0.60)'],
  glowTop: ['rgba(88, 166, 255, 0.20)', 'rgba(88, 166, 255, 0)'],
  glowBottom: ['rgba(56, 139, 253, 0.14)', 'rgba(56, 139, 253, 0)'],
  menuBackground: 'rgba(8, 12, 18, 0.97)',
  menuBorder: 'rgba(88, 166, 255, 0.22)',
};

const nocturne = {
  text: '#EEF6F2',
  background: '#07110E',
  surface: 'rgba(13, 28, 24, 0.84)',
  tint: '#2DD4BF',
  tintLight: '#F59E0B',
  tintDark: '#0F766E',
  icon: '#2DD4BF',
  subtleText: 'rgba(238, 246, 242, 0.58)',
  border: '#18332B',
  gradientBackground: ['#07110E', '#0D1C18', '#14120A'],
  gradientPrimary: ['#2DD4BF', '#F59E0B'],
  gradientCard: ['rgba(13, 28, 24, 0.84)', 'rgba(20, 18, 10, 0.62)'],
  glowTop: ['rgba(45, 212, 191, 0.20)', 'rgba(45, 212, 191, 0)'],
  glowBottom: ['rgba(245, 158, 11, 0.14)', 'rgba(245, 158, 11, 0)'],
  menuBackground: 'rgba(5, 12, 10, 0.97)',
  menuBorder: 'rgba(45, 212, 191, 0.24)',
};

const rosewood = {
  text: '#FFEFF4',
  background: '#13070B',
  surface: 'rgba(34, 12, 18, 0.84)',
  tint: '#FB7185',
  tintLight: '#38BDF8',
  tintDark: '#BE123C',
  icon: '#FB7185',
  subtleText: 'rgba(255, 239, 244, 0.58)',
  border: '#3A1620',
  gradientBackground: ['#13070B', '#220C12', '#071722'],
  gradientPrimary: ['#FB7185', '#38BDF8'],
  gradientCard: ['rgba(34, 12, 18, 0.84)', 'rgba(7, 23, 34, 0.62)'],
  glowTop: ['rgba(251, 113, 133, 0.22)', 'rgba(251, 113, 133, 0)'],
  glowBottom: ['rgba(56, 189, 248, 0.12)', 'rgba(56, 189, 248, 0)'],
  menuBackground: 'rgba(15, 5, 9, 0.97)',
  menuBorder: 'rgba(251, 113, 133, 0.24)',
};

// ============================================================
// COLORS MAP
// ============================================================
export const Colors: Record<string, any> = {
  light: cloud,
  dark: obsidian,
  pearl,
  ivory,
  cloud,
  lavender,
  sand,
  prism,
  orchard,
  roseQuartz,
  mint,
  citrus,
  obsidian,
  sapphire,
  amethyst,
  ember,
  carbon,
  copper,
  slate,
  nocturne,
  rosewood,
  // Semantic
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  primary: '#C9A84C',
  secondary: '#3B7DD8',
  accent: '#06B6D4',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const PRIMARY_COLOR = '#C9A84C';
export const DEFAULT_THEME = 'dark';

// ============================================================
// REQUIRED KEYS
// ============================================================
const REQUIRED_KEYS: string[] = [
  'text',
  'background',
  'surface',
  'tint',
  'subtleText',
  'border',
  'gradientBackground',
  'gradientPrimary',
  'gradientCard',
  'glowTop',
  'glowBottom',
  'menuBackground',
  'menuBorder',
];

// ============================================================
// UTILITIES
// ============================================================

export function isThemeLike(value: unknown): value is Record<string, any> {
  if (value === null || value === undefined) return false;
  if (typeof value !== 'object') return false;
  if (Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  for (let i = 0; i < REQUIRED_KEYS.length; i++) {
    if (!(REQUIRED_KEYS[i] in obj)) return false;
  }
  return true;
}

export function getAvailableThemes(): string[] {
  const result: string[] = [];
  const keys = Object.keys(Colors);
  for (let i = 0; i < keys.length; i++) {
    if (isThemeLike(Colors[keys[i]])) {
      result.push(keys[i]);
    }
  }
  return result;
}

export function isThemeKey(theme: unknown): theme is string {
  if (typeof theme !== 'string' || theme.length === 0) return false;
  return isThemeLike(Colors[theme]);
}

export function getThemeColors(theme?: string | null): Record<string, any> {
  if (typeof theme === 'string' && theme.length > 0) {
    const requested = Colors[theme];
    if (isThemeLike(requested)) return requested;
  }
  const def = Colors[DEFAULT_THEME];
  if (isThemeLike(def)) return def;
  const keys = Object.keys(Colors);
  for (let i = 0; i < keys.length; i++) {
    const t = Colors[keys[i]];
    if (isThemeLike(t)) return t;
  }
  return FALLBACK_THEME;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (typeof hex !== 'string' || hex.length === 0) return null;
  const clean = hex.charAt(0) === '#' ? hex.slice(1) : hex;
  if (clean.length === 3) {
    return {
      r: parseInt(clean.charAt(0) + clean.charAt(0), 16),
      g: parseInt(clean.charAt(1) + clean.charAt(1), 16),
      b: parseInt(clean.charAt(2) + clean.charAt(2), 16),
    };
  }
  if (clean.length === 6) {
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16),
    };
  }
  return null;
}

function getRelativeLuminance(themeColors: Record<string, any>): number | null {
  if (!isThemeLike(themeColors)) return null;
  const bg = themeColors['background'];
  if (typeof bg !== 'string' || bg.length === 0) return null;
  const rgb = hexToRgb(bg);
  if (rgb === null) return null;
  const channel = function (c: number): number {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

export function isDarkTheme(theme?: string | null): boolean {
  const colors = getThemeColors(theme);
  const lum = getRelativeLuminance(colors);
  if (lum === null) return false;
  return lum < 0.35;
}

export function getThemeDisplayName(themeKey: string): string {
  if (typeof themeKey !== 'string' || themeKey.length === 0) return '';
  return themeKey
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, function (c: string) { return c.toUpperCase(); })
    .trim();
}
