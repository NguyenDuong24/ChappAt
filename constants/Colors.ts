// Modern Color Palette 2025 - Material Design 3 + Contemporary Trends
const modernPrimary = '#6366F1'; // Indigo-500 - Contemporary and professional
const modernSecondary = '#EC4899'; // Pink-500 - Vibrant and engaging
const modernAccent = '#10B981'; // Emerald-500 - Fresh and modern

export const Colors = {
  light: {
    // Core Text & Background
    text: '#0F172A', // Slate-900 - Deep, rich black for excellent readability
    background: '#FFFFFF', // Pure white - Clean and minimal
    surface: '#F8FAFC', // Slate-50 - Subtle background variation
    
    // Primary Colors
    tint: modernPrimary, // Indigo-500 - Main brand color
    tintLight: '#A5B4FC', // Indigo-300 - Lighter variant
    tintDark: '#4338CA', // Indigo-700 - Darker variant
    
    // Icons & Interactive Elements
    icon: '#64748B', // Slate-500 - Balanced gray for icons
    iconActive: modernPrimary, // Active state
    iconInactive: '#CBD5E1', // Slate-300 - Inactive state
    
    // Navigation & Tabs
    tabIconDefault: '#94A3B8', // Slate-400 - Subtle inactive tabs
    tabIconSelected: modernPrimary, // Active tab color
    backgroundHeader: '#F1F5F9', // Slate-100 - Light header background
    
    // Borders & Dividers
    border: '#E2E8F0', // Slate-200 - Subtle borders
    borderLight: '#F1F5F9', // Slate-100 - Very light borders
    borderDark: '#CBD5E1', // Slate-300 - Stronger borders
    
    // Cards & Surfaces
    cardBackground: '#FFFFFF', // Pure white cards
    cardBackgroundElevated: '#FEFEFE', // Slightly off-white for elevated cards
    
    // Text Variations
    subtleText: '#64748B', // Slate-500 - Secondary text
    mutedText: '#94A3B8', // Slate-400 - Muted text
    highlightText: modernSecondary, // Pink for highlights
    placeholderText: '#94A3B8', // Slate-400 - Form placeholders
    
    // Input & Form Elements
    inputBackground: '#FFFFFF', // White input background
    inputBorder: '#D1D5DB', // Gray-300 - Input borders
    inputFocus: modernPrimary, // Focus state color
    
    // Special Elements
    addressText: '#059669', // Emerald-600 - Location text
    commentBackground: '#F1F5F9', // Slate-100 - Comment bubbles
    codeBackground: '#F8FAFC', // Slate-50 - Code blocks
    
    // Gradients
    gradientBackground: ['#6366F1', '#8B5CF6'], // Indigo to Purple
    gradientCard: ['#FFFFFF', '#F8FAFC'], // White to Slate-50
  },
  
  dark: {
    // Core Text & Background
    text: '#F8FAFC', // Slate-50 - Light text on dark
    background: '#0F172A', // Slate-900 - Deep dark background
    surface: '#1E293B', // Slate-800 - Dark surface variation
    
    // Primary Colors
    tint: '#818CF8', // Indigo-400 - Lighter primary for dark mode
    tintLight: '#C7D2FE', // Indigo-200 - Very light variant
    tintDark: '#6366F1', // Indigo-500 - Standard variant
    
    // Icons & Interactive Elements
    icon: '#CBD5E1', // Slate-300 - Light icons on dark
    iconActive: '#818CF8', // Indigo-400 - Active state
    iconInactive: '#64748B', // Slate-500 - Inactive state
    
    // Navigation & Tabs
    tabIconDefault: '#64748B', // Slate-500 - Inactive tabs
    tabIconSelected: '#818CF8', // Indigo-400 - Active tab
    backgroundHeader: '#1E293B', // Slate-800 - Dark header
    
    // Borders & Dividers
    border: '#334155', // Slate-700 - Dark borders
    borderLight: '#475569', // Slate-600 - Lighter dark borders
    borderDark: '#1E293B', // Slate-800 - Darker borders
    
    // Cards & Surfaces
    cardBackground: '#1E293B', // Slate-800 - Dark cards
    cardBackgroundElevated: '#334155', // Slate-700 - Elevated dark cards
    
    // Text Variations
    subtleText: '#94A3B8', // Slate-400 - Secondary text
    mutedText: '#64748B', // Slate-500 - Muted text
    highlightText: '#F472B6', // Pink-400 - Highlights in dark mode
    placeholderText: '#64748B', // Slate-500 - Form placeholders
    
    // Input & Form Elements
    inputBackground: '#334155', // Slate-700 - Dark input background
    inputBorder: '#475569', // Slate-600 - Input borders
    inputFocus: '#818CF8', // Indigo-400 - Focus state
    
    // Special Elements
    addressText: '#34D399', // Emerald-400 - Location text in dark
    commentBackground: '#334155', // Slate-700 - Dark comment bubbles
    codeBackground: '#1E293B', // Slate-800 - Dark code blocks
    
    // Gradients
    gradientBackground: ['#312E81', '#1E293B'], // Indigo-800 to Slate-800
    gradientCard: ['#1E293B', '#334155'], // Slate-800 to Slate-700
  },
  
  // === SEMANTIC COLORS === //
  // Success States
  success: '#10B981', // Emerald-500 - Modern success green
  successLight: '#6EE7B7', // Emerald-300 - Light success
  successDark: '#047857', // Emerald-700 - Dark success
  
  // Error States
  error: '#EF4444', // Red-500 - Modern error red
  errorLight: '#FCA5A5', // Red-300 - Light error
  errorDark: '#DC2626', // Red-600 - Dark error
  
  // Warning States
  warning: '#F59E0B', // Amber-500 - Modern warning
  warningLight: '#FDE68A', // Amber-200 - Light warning
  warningDark: '#D97706', // Amber-600 - Dark warning
  
  // Info States
  info: '#3B82F6', // Blue-500 - Modern info blue
  infoLight: '#93C5FD', // Blue-300 - Light info
  infoDark: '#2563EB', // Blue-600 - Dark info
  
  // === BRAND COLORS === //
  primary: modernPrimary, // Main brand color
  secondary: modernSecondary, // Secondary brand color
  accent: modernAccent, // Accent color
  
  // === NEUTRAL PALETTE === //
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  
  // Gray Scale (Slate palette - more modern than basic gray)
  gray50: '#F8FAFC',
  gray100: '#F1F5F9',
  gray200: '#E2E8F0',
  gray300: '#CBD5E1',
  gray400: '#94A3B8',
  gray500: '#64748B',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1E293B',
  gray900: '#0F172A',
  
  // === SPECIAL PURPOSE COLORS === //
  // Links & Navigation
  link: modernPrimary,
  linkHover: '#4338CA', // Indigo-700
  linkVisited: '#7C3AED', // Violet-600
  
  // Badges & Status
  badgeSuccess: '#10B981', // Emerald-500
  badgeError: '#EF4444', // Red-500
  badgeWarning: '#F59E0B', // Amber-500
  badgeInfo: '#3B82F6', // Blue-500
  badgePrimary: modernPrimary,
  badgeSecondary: '#64748B', // Slate-500
  
  // Overlays & Backdrops
  backdrop: 'rgba(15, 23, 42, 0.75)', // Slate-900 with opacity
  overlay: 'rgba(0, 0, 0, 0.5)',
  modalBackdrop: 'rgba(15, 23, 42, 0.8)',

  
  // === SOCIAL MEDIA BRAND COLORS === //
  // Updated with 2025 brand colors
  facebook: '#1877F2', // Facebook Blue
  instagram: '#E4405F', // Instagram Pink (primary)
  twitter: '#1DA1F2', // Twitter Blue (X)
  tiktok: '#000000', // TikTok Black
  youtube: '#FF0000', // YouTube Red
  linkedin: '#0A66C2', // LinkedIn Blue
  whatsapp: '#25D366', // WhatsApp Green
  telegram: '#0088CC', // Telegram Blue
  discord: '#5865F2', // Discord Blurple
  spotify: '#1DB954', // Spotify Green
  
  // === GRADIENT COLLECTIONS === //
  // Modern gradient combinations for 2025
  gradients: {
    // Primary Gradients
    sunset: ['#FF6B6B', '#FFE66D'], // Coral to Yellow
    ocean: ['#667EEA', '#764BA2'], // Blue to Purple
    forest: ['#134E5E', '#71B280'], // Dark Teal to Green
    cosmic: ['#C33764', '#1D2671'], // Pink to Navy
    
    // Brand Gradients
    primary: [modernPrimary, '#8B5CF6'], // Indigo to Purple
    secondary: [modernSecondary, '#F97316'], // Pink to Orange
    success: ['#10B981', '#34D399'], // Emerald gradient
    
    // Neutral Gradients
    grayLight: ['#F8FAFC', '#E2E8F0'], // Light gray gradient
    grayDark: ['#1E293B', '#0F172A'], // Dark gray gradient
    
    // Special Effects
    glass: ['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.05)'], // Glassmorphism
    aurora: ['#667EEA', '#764BA2', '#F093FB'], // Aurora effect
    neon: ['#FF0080', '#FF8C00', '#40E0D0'], // Neon effect
  },
  
  // === THEME VARIATIONS === //
  themes: {
    // Modern minimalist theme
    minimal: {
      primary: '#000000',
      secondary: '#FFFFFF',
      accent: '#6366F1',
    },
    
    // Vibrant theme for younger audience
    vibrant: {
      primary: '#FF6B6B',
      secondary: '#4ECDC4',
      accent: '#FFE66D',
    },
    
    // Professional theme for business
    professional: {
      primary: '#1E40AF', // Blue-800
      secondary: '#64748B', // Slate-500
      accent: '#10B981', // Emerald-500
    },
    
    // Dark gaming theme
    gaming: {
      primary: '#7C3AED', // Violet-600
      secondary: '#EC4899', // Pink-500
      accent: '#06FFA5', // Neon green
    },
  },
};