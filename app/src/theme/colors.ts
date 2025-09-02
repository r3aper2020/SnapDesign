export const colors = {
  // Light theme colors
  light: {
    // Primary colors
    primary: {
      main: '#007AFF',
      light: '#4DA3FF',
      dark: '#0056CC',
      contrast: '#FFFFFF',
    },
    
    // Secondary colors
    secondary: {
      main: '#5856D6',
      light: '#7A79E0',
      dark: '#3E3D99',
      contrast: '#FFFFFF',
    },
    
    // Success colors
    success: {
      main: '#34C759',
      light: '#5CD675',
      dark: '#28A745',
      contrast: '#FFFFFF',
    },
    
    // Warning colors
    warning: {
      main: '#FF9500',
      light: '#FFB340',
      dark: '#CC7700',
      contrast: '#FFFFFF',
    },
    
    // Error colors
    error: {
      main: '#FF3B30',
      light: '#FF6B61',
      dark: '#CC2E26',
      contrast: '#FFFFFF',
    },
    
    // Neutral colors
    neutral: {
      white: '#FFFFFF',
      black: '#000000',
      gray: {
        50: '#F9FAFB',
        100: '#F3F4F6',
        200: '#E5E7EB',
        300: '#D1D5DB',
        400: '#9CA3AF',
        500: '#6B7280',
        600: '#4B5563',
        700: '#374151',
        800: '#1F2937',
        900: '#111827',
      },
    },
    
    // Background colors
    background: {
      primary: '#FFFFFF',
      secondary: '#F5F5F5',
      tertiary: '#F9FAFB',
      dark: '#1F2937',
    },
    
    // Text colors
    text: {
      primary: '#1F2937',
      secondary: '#6B7280',
      tertiary: '#9CA3AF',
      inverse: '#FFFFFF',
      disabled: '#D1D5DB',
    },
    
    // Border colors
    border: {
      light: '#E5E7EB',
      medium: '#D1D5DB',
      dark: '#9CA3AF',
    },
    
    // Shadow colors
    shadow: {
      light: 'rgba(0, 0, 0, 0.1)',
      medium: 'rgba(0, 0, 0, 0.15)',
      dark: 'rgba(0, 0, 0, 0.25)',
    },
  },

  // Dark theme colors
  dark: {
    // Primary colors
    primary: {
      main: '#0A84FF',
      light: '#5E9EFF',
      dark: '#0056CC',
      contrast: '#FFFFFF',
    },
    
    // Secondary colors
    secondary: {
      main: '#5E5CE6',
      light: '#7A79E0',
      dark: '#3E3D99',
      contrast: '#FFFFFF',
    },
    
    // Success colors
    success: {
      main: '#30D158',
      light: '#5CD675',
      dark: '#28A745',
      contrast: '#FFFFFF',
    },
    
    // Warning colors
    warning: {
      main: '#FF9F0A',
      light: '#FFB340',
      dark: '#CC7700',
      contrast: '#FFFFFF',
    },
    
    // Error colors
    error: {
      main: '#FF453A',
      light: '#FF6B61',
      dark: '#CC2E26',
      contrast: '#FFFFFF',
    },
    
    // Neutral colors
    neutral: {
      white: '#FFFFFF',
      black: '#000000',
      gray: {
        50: '#111827',
        100: '#1F2937',
        200: '#374151',
        300: '#4B5563',
        400: '#6B7280',
        500: '#9CA3AF',
        600: '#D1D5DB',
        700: '#E5E7EB',
        800: '#F3F4F6',
        900: '#F9FAFB',
      },
    },
    
    // Background colors
    background: {
      primary: '#000000',
      secondary: '#1C1C1E',
      tertiary: '#2C2C2E',
      dark: '#1F2937',
    },
    
    // Text colors
    text: {
      primary: '#FFFFFF',
      secondary: '#EBEBF5',
      tertiary: '#EBEBF599',
      inverse: '#000000',
      disabled: '#3A3A3C',
    },
    
    // Border colors
    border: {
      light: '#38383A',
      medium: '#48484A',
      dark: '#636366',
    },
    
    // Shadow colors
    shadow: {
      light: 'rgba(0, 0, 0, 0.3)',
      medium: 'rgba(0, 0, 0, 0.4)',
      dark: 'rgba(0, 0, 0, 0.5)',
    },
  },
} as const;

export type ColorKey = keyof typeof colors;
export type ColorValue = typeof colors[ColorKey];
