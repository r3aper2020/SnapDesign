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
    
    // Gradient colors for modern effects
    gradient: {
      primary: ['#007AFF', '#5856D6'],
      secondary: ['#4DA3FF', '#7A79E0'],
      accent: ['#007AFF', '#0056CC', '#5856D6'],
    },
  },

  // Dark theme colors - Modern AI Assistant Design
  dark: {
    // Primary colors - Vibrant gradient teal
    primary: {
      main: '#00D4FF',
      light: '#40E0FF',
      dark: '#0099CC',
      contrast: '#FFFFFF',
    },
    
    // Secondary colors - Purple accent
    secondary: {
      main: '#8B5CF6',
      light: '#A78BFA',
      dark: '#7C3AED',
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
    
    // Background colors - Deep dark with subtle variations
    background: {
      primary: '#0A0A0A',
      secondary: '#1A1A1A',
      tertiary: '#2A2A2A',
      dark: '#000000',
    },
    
    // Text colors - Clean whites and light grays
    text: {
      primary: '#FFFFFF',
      secondary: '#E5E5E5',
      tertiary: '#B3B3B3',
      inverse: '#000000',
      disabled: '#666666',
    },
    
    // Border colors - Subtle grays
    border: {
      light: '#333333',
      medium: '#444444',
      dark: '#555555',
    },
    
    // Shadow colors - Deep shadows with subtle glow
    shadow: {
      light: 'rgba(0, 0, 0, 0.4)',
      medium: 'rgba(0, 0, 0, 0.6)',
      dark: 'rgba(0, 0, 0, 0.8)',
    },
    
    // Gradient colors for modern effects
    gradient: {
      primary: ['#00D4FF', '#8B5CF6'],
      secondary: ['#40E0FF', '#A78BFA'],
      accent: ['#00D4FF', '#0099CC', '#8B5CF6'],
    },
  },
} as const;

export type ColorKey = keyof typeof colors;
export type ColorValue = typeof colors[ColorKey];
