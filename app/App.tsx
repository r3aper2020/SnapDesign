import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ThemeProvider, useTheme } from './src/theme';
import { AuthProvider } from './src/contexts/AuthContext';

const AppContent = () => {
  const { isDark } = useTheme();
  
  return (
    <>
      <AppNavigator />
      <StatusBar style={isDark ? "light" : "dark"} hidden={true} />
    </>
  );
};

export default function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <ThemeProvider initialTheme="dark">
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
