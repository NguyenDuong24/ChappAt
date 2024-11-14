const tintColorLight = '#3A8DFF'; // Sky blue for light theme
const tintColorDark = '#BB86FC';  // Pastel purple for dark theme

export const Colors = {
  light: {
    text: '#2C2F33', // Dark gray text for readability
    background: '#F9F9F9', // Soft off-white background
    tint: tintColorLight, // Sky blue accent
    icon: '#A0A8B0', // Soft gray icons
    tabIconDefault: '#9A9A9A', // Neutral gray for default tab icons
    tabIconSelected: tintColorLight, // Sky blue for selected icons
    backgroundHeader: tintColorLight, // Light blue header
    border: '#E1E4E8', // Light gray border color
    cardBackground: '#FFFFFF', // Clean white for card backgrounds
    subtleText: '#8A8D93', // Muted gray for secondary text
    highlightText: '#1E88E5', // Strong blue for highlighted text
    placeholderText: '#B0B0B0', // Light gray for placeholder text
    inputBackground: '#FFFFFF', // Light background for input fields (white)
  },
  dark: {
    text: '#ECEDEE', // Very light gray for main text
    background: '#121212', // Dark background for dark mode
    tint: tintColorDark, // Lavender accents
    icon: '#9E9E9E', // Light gray icons
    tabIconDefault: '#9E9E9E', // Muted gray default icons
    tabIconSelected: tintColorDark, // Lavender for selected icons
    backgroundHeader: '#BB86FC', // Soft purple header
    border: '#33373D', // Dark gray for borders
    cardBackground: '#2C2C2E', // Dark card backgrounds
    subtleText: '#A0A0A0', // Light gray for secondary text
    highlightText: '#9DA7FF', // Soft blue for highlighted text
    placeholderText: '#616161', // Dark gray for placeholder text
    inputBackground: '#333333', // Dark background for input fields (dark gray)
  },
  primary: '#5E5BFF', // Vibrant blue for primary elements
  secondary: '#FF4081', // Soft pink for secondary elements
  tertiary: '#FFB74D', // Warm orange for tertiary accents
  highlight: '#FFD700', // Gold for highlights or special emphasis
  error: '#E57373', // Soft red for error messages
  success: '#66BB6A', // Fresh green for success messages
  warning: '#FFB74D', // Warm yellow for warnings
  info: '#4FC3F7', // Light blue for informational messages
  neutralLight: '#F4F5F7', // Very light gray for backgrounds or dividers
  neutralDark: '#616161', // Darker gray for subtle elements or inactive states
  backgroundLight: '#FAFAFB', // Very light background
  backgroundDark: '#2C2C2E', // Dark mode background
  link: '#1E88E5', // Blue for links
  badgeRed: '#FF6347', // Red for badges or notifications
  badgeGreen: '#32CD32', // Green for badges or active indicators
  badgeBlue: '#4169E1', // Royal blue for badges or notifications
  borderLine: '#DDDDDD', // Soft border line color
};
