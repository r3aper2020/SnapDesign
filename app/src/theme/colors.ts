export const colors = {
  // Light theme colors - ReVibe Brand
  light: {
    // Primary colors - ReVibe gradient colors
    primary: {
      main: '#FF6A3D', // Sunset Orange
      light: '#FF8A5C',
      dark: '#E55A2D',
      contrast: '#FFFFFF',
    },
    
    // Secondary colors - Electric Blue
    secondary: {
      main: '#2F80ED', // Electric Blue
      light: '#5A9FFF',
      dark: '#1E5BB8',
      contrast: '#FFFFFF',
    },
    
    // Accent colors
    accent: {
      pink: '#FF3E81', // Vivid Pink
      purple: '#9B51E0', // Vibrant Purple
      orange: '#FF6A3D', // Sunset Orange
      blue: '#2F80ED', // Electric Blue
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
    
    // Gradient colors for ReVibe brand
    gradient: {
      primary: ['#FF6A3D', '#FF3E81', '#9B51E0'], // Orange → Pink → Purple
      secondary: ['#2F80ED', '#9B51E0'], // Blue → Purple
      accent: ['#FF6A3D', '#FF3E81'], // Orange → Pink
      energy: ['#FF3E81', '#9B51E0', '#2F80ED'], // Pink → Purple → Blue
    },
  },

  // Dark theme colors - ReVibe Brand (Primary Theme)
  dark: {
    // Primary colors - ReVibe gradient colors
    primary: {
      main: '#FF6A3D', // Sunset Orange
      light: '#FF8A5C',
      dark: '#E55A2D',
      contrast: '#FFFFFF',
    },
    
    // Secondary colors - Electric Blue
    secondary: {
      main: '#2F80ED', // Electric Blue
      light: '#5A9FFF',
      dark: '#1E5BB8',
      contrast: '#FFFFFF',
    },
    
    // Accent colors
    accent: {
      pink: '#FF3E81', // Vivid Pink
      purple: '#9B51E0', // Vibrant Purple
      orange: '#FF6A3D', // Sunset Orange
      blue: '#2F80ED', // Electric Blue
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
    
    // Neutral colors - ReVibe dark theme
    neutral: {
      white: '#FFFFFF',
      black: '#000000',
      gray: {
        50: '#121212', // Dark Charcoal
        100: '#1E1E1E', // Deep Gray
        200: '#2A2A2A',
        300: '#3A3A3A',
        400: '#4A4A4A',
        500: '#6A6A6A',
        600: '#8A8A8A',
        700: '#A1A1A1', // Soft Gray
        800: '#C1C1C1',
        900: '#FFFFFF', // Pure White
      },
    },
    
    // Background colors - ReVibe dark theme
    background: {
      primary: '#121212', // Dark Charcoal (main background)
      secondary: '#1E1E1E', // Deep Gray (cards, surfaces)
      tertiary: '#2A2A2A',
      dark: '#000000',
    },
    
    // Text colors - ReVibe dark theme
    text: {
      primary: '#FFFFFF', // Pure White (primary text)
      secondary: '#A1A1A1', // Soft Gray (secondary text)
      tertiary: '#8A8A8A',
      inverse: '#121212',
      disabled: '#4A4A4A',
    },
    
    // Border colors - ReVibe dark theme
    border: {
      light: '#2A2A2A',
      medium: '#3A3A3A',
      dark: '#4A4A4A',
    },
    
    // Shadow colors - ReVibe dark theme
    shadow: {
      light: 'rgba(0, 0, 0, 0.4)',
      medium: 'rgba(0, 0, 0, 0.6)',
      dark: 'rgba(0, 0, 0, 0.8)',
    },
    
    // Gradient colors for ReVibe brand
    gradient: {
      primary: ['#FF6A3D', '#FF3E81', '#9B51E0'], // Orange → Pink → Purple
      secondary: ['#2F80ED', '#9B51E0'], // Blue → Purple
      accent: ['#FF6A3D', '#FF3E81'], // Orange → Pink
      energy: ['#FF3E81', '#9B51E0', '#2F80ED'], // Pink → Purple → Blue
      button: ['#FF6A3D', '#FF3E81', '#9B51E0'], // Primary button gradient
      hover: ['#FF8A5C', '#FF5A91', '#B571F0'], // Brighter hover states
    },
  },
} as const;

export type ColorKey = keyof typeof colors;
export type ColorValue = typeof colors[ColorKey];