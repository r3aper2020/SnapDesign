import React, { createContext, useContext, useState, ReactNode } from 'react';
import { colors } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';
import { shadows } from './shadows';

// Theme context type for React Context
export interface ThemeContextType {
  theme: {
    colors: typeof colors.light | typeof colors.dark;
    typography: typeof typography;
    spacing: typeof spacing;
    shadows: typeof shadows;
  };
  isDark: boolean;
  toggleTheme?: () => void;
}

// Create the theme context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Theme provider props
interface ThemeProviderProps {
  children: ReactNode;
  initialTheme?: 'light' | 'dark';
}

// Theme provider component
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  initialTheme = 'dark' 
}) => {
  const [isDark, setIsDark] = useState(initialTheme === 'dark');

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  // Get the current theme colors based on isDark state
  const currentColors = isDark ? colors.dark : colors.light;

  const value: ThemeContextType = {
    theme: {
      colors: currentColors,
      typography,
      spacing,
      shadows,
    },
    isDark,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use theme
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Hook to get just the theme object
export const useThemeColors = () => {
  const { theme } = useTheme();
  return theme.colors;
};

// Hook to get just the typography
export const useThemeTypography = () => {
  const { theme } = useTheme();
  return theme.typography;
};

// Hook to get just the spacing
export const useThemeSpacing = () => {
  const { theme } = useTheme();
  return theme.spacing;
};

// Hook to get just the shadows
export const useThemeShadows = () => {
  const { theme } = useTheme();
  return theme.shadows;
};
