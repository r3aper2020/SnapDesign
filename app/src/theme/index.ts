import { colors } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';
import { shadows } from './shadows';

// Export individual theme components
export { colors, typography, spacing, shadows };

// Export types
export type { ColorKey, ColorValue } from './colors';
export type { TypographyKey, TypographyValue } from './typography';
export type { SpacingKey, SpacingValue } from './spacing';
export type { ShadowKey, ShadowValue } from './shadows';

// Export ThemeProvider and hooks
export { ThemeProvider, useTheme, useThemeColors, useThemeTypography, useThemeSpacing, useThemeShadows, ThemeContextType } from './ThemeProvider';
