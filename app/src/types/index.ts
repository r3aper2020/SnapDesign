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
