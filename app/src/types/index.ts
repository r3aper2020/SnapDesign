// Navigation types (placeholder for when you add navigation)
export interface NavigationProps {
  navigation: any;
  route: any;
}

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

// Cleaning step interface
export interface CleaningStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  estimatedTime?: string;
}

// Service option interface
export interface ServiceOption {
  id: ServiceType;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  gradient: readonly [string, string];
}
