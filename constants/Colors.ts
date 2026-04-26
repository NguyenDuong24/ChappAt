// ============================================================
// Premium Color Palette 2025
// Professional · Harmonious · Hermes-Safe
// 5 Light Themes + 7 Dark Themes
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
// LIGHT THEMES
// ============================================================

const pearl: Record<string, any> = {
  text: '#2A2620',
  background: '#FDFBF7',
  surface: 'rgba(255, 255, 255, 0.96)',
  tint: '#D4A744',
  tintLight: '#E8C368',
  tintDark: '#A67C1A',
  icon: '#D4A744',
  subtleText: 'rgba(42, 38, 32, 0.58)',
  border: '#F0E8DE',
  gradientBackground: ['#FDFBF7', '#FAF6F0', '#FDFAF5'],
  gradientPrimary: ['#D4A744', '#E8C368'],
  gradientCard: ['rgba(255, 255, 255, 0.96)', 'rgba(253, 250, 245, 0.82)'],
  glowTop: ['rgba(212, 167, 68, 0.14)', 'rgba(212, 167, 68, 0)'],
  glowBottom: ['rgba(232, 195, 104, 0.10)', 'rgba(232, 195, 104, 0)'],
  menuBackground: 'rgba(253, 251, 248, 0.98)',
  menuBorder: 'rgba(212, 167, 68, 0.28)',
};

const ivory: Record<string, any> = {
  text: '#2E3B2A',
  background: '#FAF9F5',
  surface: 'rgba(255, 255, 255, 0.94)',
  tint: '#6B9366',
  tintLight: '#8FB591',
  tintDark: '#4A6B42',
  icon: '#6B9366',
  subtleText: 'rgba(46, 59, 42, 0.60)',
  border: '#E2EDD9',
  gradientBackground: ['#FAF9F5', '#F4F7F0', '#F7F6F2'],
  gradientPrimary: ['#6B9366', '#8FB591'],
  gradientCard: ['rgba(255, 255, 255, 0.94)', 'rgba(244, 247, 240, 0.78)'],
  glowTop: ['rgba(107, 147, 102, 0.14)', 'rgba(107, 147, 102, 0)'],
  glowBottom: ['rgba(143, 181, 145, 0.10)', 'rgba(143, 181, 145, 0)'],
  menuBackground: 'rgba(252, 253, 250, 0.98)',
  menuBorder: 'rgba(107, 147, 102, 0.28)',
};

const cloud: Record<string, any> = {
  text: '#1B3352',
  background: '#F6F9FE',
  surface: 'rgba(255, 255, 255, 0.96)',
  tint: '#2E7FD8',
  tintLight: '#5A9FE8',
  tintDark: '#1A5DB8',
  icon: '#2E7FD8',
  subtleText: 'rgba(27, 51, 82, 0.60)',
  border: '#DDF0FA',
  gradientBackground: ['#F6F9FE', '#EEF5FD', '#F2F8FE'],
  gradientPrimary: ['#2E7FD8', '#5A9FE8'],
  gradientCard: ['rgba(255, 255, 255, 0.96)', 'rgba(238, 245, 253, 0.80)'],
  glowTop: ['rgba(46, 127, 216, 0.14)', 'rgba(46, 127, 216, 0)'],
  glowBottom: ['rgba(90, 159, 232, 0.10)', 'rgba(90, 159, 232, 0)'],
  menuBackground: 'rgba(250, 253, 255, 0.98)',
  menuBorder: 'rgba(46, 127, 216, 0.28)',
};

const lavender: Record<string, any> = {
  text: '#3A2454',
  background: '#F9F8FE',
  surface: 'rgba(255, 255, 255, 0.96)',
  tint: '#8D5FE8',
  tintLight: '#B59FF5',
  tintDark: '#6D3FD0',
  icon: '#8D5FE8',
  subtleText: 'rgba(58, 36, 84, 0.62)',
  border: '#F0ECFF',
  gradientBackground: ['#F9F8FE', '#F3EFFF', '#F7F4FF'],
  gradientPrimary: ['#8D5FE8', '#B59FF5'],
  gradientCard: ['rgba(255, 255, 255, 0.96)', 'rgba(243, 239, 255, 0.80)'],
  glowTop: ['rgba(141, 95, 232, 0.14)', 'rgba(141, 95, 232, 0)'],
  glowBottom: ['rgba(181, 159, 245, 0.10)', 'rgba(181, 159, 245, 0)'],
  menuBackground: 'rgba(253, 251, 255, 0.98)',
  menuBorder: 'rgba(141, 95, 232, 0.28)',
};

const sand: Record<string, any> = {
  text: '#4A2E1C',
  background: '#FCF7F2',
  surface: 'rgba(255, 255, 255, 0.96)',
  tint: '#D17240',
  tintLight: '#E5956A',
  tintDark: '#B84D28',
  icon: '#D17240',
  subtleText: 'rgba(74, 46, 28, 0.62)',
  border: '#F2E3D5',
  gradientBackground: ['#FCF7F2', '#F8EEEA', '#FAF5F0'],
  gradientPrimary: ['#D17240', '#E5956A'],
  gradientCard: ['rgba(255, 255, 255, 0.96)', 'rgba(248, 238, 234, 0.82)'],
  glowTop: ['rgba(209, 114, 64, 0.14)', 'rgba(209, 114, 64, 0)'],
  glowBottom: ['rgba(229, 149, 106, 0.10)', 'rgba(229, 149, 106, 0)'],
  menuBackground: 'rgba(255, 252, 249, 0.98)',
  menuBorder: 'rgba(209, 114, 64, 0.28)',
};

// ============================================================
// DARK THEMES
// ============================================================

const obsidian: Record<string, any> = {
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

const sapphire: Record<string, any> = {
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

const amethyst: Record<string, any> = {
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

const ember: Record<string, any> = {
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

const carbon: Record<string, any> = {
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

const copper: Record<string, any> = {
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

const slate: Record<string, any> = {
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

const prism: Record<string, any> = {
  text: '#14213D',
  background: '#F7FAFC',
  surface: 'rgba(255, 255, 255, 0.95)',
  tint: '#0EA5A8',
  tintLight: '#F9738A',
  tintDark: '#0F766E',
  icon: '#0EA5A8',
  subtleText: 'rgba(20, 33, 61, 0.58)',
  border: '#DCE8EF',
  gradientBackground: ['#F7FAFC', '#EEF8F6', '#FFF5F6'],
  gradientPrimary: ['#0EA5A8', '#F9738A'],
  gradientCard: ['rgba(255, 255, 255, 0.96)', 'rgba(238, 248, 246, 0.78)'],
  glowTop: ['rgba(14, 165, 168, 0.14)', 'rgba(14, 165, 168, 0)'],
  glowBottom: ['rgba(249, 115, 138, 0.10)', 'rgba(249, 115, 138, 0)'],
  menuBackground: 'rgba(250, 253, 253, 0.98)',
  menuBorder: 'rgba(14, 165, 168, 0.26)',
};

const orchard: Record<string, any> = {
  text: '#173225',
  background: '#F6FBF5',
  surface: 'rgba(255, 255, 255, 0.95)',
  tint: '#2F855A',
  tintLight: '#E0A458',
  tintDark: '#276749',
  icon: '#2F855A',
  subtleText: 'rgba(23, 50, 37, 0.58)',
  border: '#DDEDDC',
  gradientBackground: ['#F6FBF5', '#EDF7EE', '#FFF8EA'],
  gradientPrimary: ['#2F855A', '#E0A458'],
  gradientCard: ['rgba(255, 255, 255, 0.95)', 'rgba(237, 247, 238, 0.80)'],
  glowTop: ['rgba(47, 133, 90, 0.14)', 'rgba(47, 133, 90, 0)'],
  glowBottom: ['rgba(224, 164, 88, 0.10)', 'rgba(224, 164, 88, 0)'],
  menuBackground: 'rgba(251, 254, 250, 0.98)',
  menuBorder: 'rgba(47, 133, 90, 0.26)',
};

const nocturne: Record<string, any> = {
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

const rosewood: Record<string, any> = {
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
  // Legacy aliases for backwards compatibility
  light: cloud,
  dark: obsidian,
  // Light
  pearl,
  ivory,
  cloud,
  lavender,
  sand,
  prism,
  orchard,
  // Dark
  obsidian,
  sapphire,
  amethyst,
  ember,
  carbon,
  copper,
  slate,
  nocturne,
  rosewood,
  // Semantic (global — không phải theme object)
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
export const DEFAULT_THEME = 'cloud';

// ============================================================
// REQUIRED KEYS — validate theme object
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
// UTILITIES — tất cả an toàn với Hermes, không dùng ?. hay ??
// ============================================================

/**
 * Kiểm tra object có đủ cấu trúc theme không.
 */
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

/**
 * Danh sách tên theme hợp lệ.
 */
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

/**
 * Kiểm tra key có phải theme hợp lệ không.
 */
export function isThemeKey(theme: unknown): theme is string {
  if (typeof theme !== 'string' || theme.length === 0) return false;
  return isThemeLike(Colors[theme]);
}

/**
 * Lấy màu theme — LUÔN trả về object hợp lệ.
 * Không bao giờ trả về undefined, null, hoặc {}.
 */
export function getThemeColors(theme?: string | null): Record<string, any> {
  // 1. Theme được yêu cầu
  if (typeof theme === 'string' && theme.length > 0) {
    const requested = Colors[theme];
    if (isThemeLike(requested)) return requested;
  }

  // 2. DEFAULT_THEME
  const def = Colors[DEFAULT_THEME];
  if (isThemeLike(def)) return def;

  // 3. Bất kỳ theme nào tìm được
  const keys = Object.keys(Colors);
  for (let i = 0; i < keys.length; i++) {
    const t = Colors[keys[i]];
    if (isThemeLike(t)) return t;
  }

  // 4. Hard fallback — không bao giờ crash dù Colors bị xóa hết
  return FALLBACK_THEME;
}

/**
 * Chuyển hex string sang RGB. An toàn với Hermes.
 */
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

/**
 * Tính relative luminance — trả về null nếu không tính được.
 */
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

/**
 * Kiểm tra theme có phải dark mode không.
 */
export function isDarkTheme(theme?: string | null): boolean {
  const colors = getThemeColors(theme);
  const lum = getRelativeLuminance(colors);
  if (lum === null) return false;
  return lum < 0.35;
}

/**
 * Chuyển camelCase key thành tên hiển thị.
 * Ví dụ: 'roseQuartz' → 'Rose Quartz'
 */
export function getThemeDisplayName(themeKey: string): string {
  if (typeof themeKey !== 'string' || themeKey.length === 0) return '';
  return themeKey
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, function (c: string) { return c.toUpperCase(); })
    .trim();
}
