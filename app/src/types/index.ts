// Re-export types from navigation for consistency
export type { Product, CleaningStep, RootStackParamList } from '../navigation/AppNavigator';

// Common component props
export interface BaseComponentProps {
  children?: React.ReactNode;
  style?: any;
}

// Button props
export interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: any;
}

// Service types
export type ServiceType = 'design' | 'declutter' | 'makeover';

// Service option interface
export interface ServiceOption {
  id: ServiceType;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  gradient: readonly [string, string];
}
