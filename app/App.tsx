import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { HomeScreen } from './src/screens';
import { ThemeProvider, useTheme } from './src/theme';

const AppContent = () => {
  const { isDark } = useTheme();
  
  return (
    <>
      <HomeScreen />
      <StatusBar style={isDark ? "light" : "dark"} />
    </>
  );
};

export default function App(): React.JSX.Element {
  return (
    <ThemeProvider initialTheme="dark">
      <AppContent />
    </ThemeProvider>
  );
}
