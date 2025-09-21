import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { SearchScreen } from '../screens/SearchScreen';
import { ResultScreen } from '../screens/ResultScreen';
import { DesignScreen } from '../screens/DesignScreen';
import { ServiceSelectionScreen } from '../screens/ServiceSelectionScreen';
import { DeclutterScreen } from '../screens/DeclutterScreen';
import { MakeoverScreen } from '../screens/MakeoverScreen';
import { LoginScreen, SignupScreen } from '../screens';
import { BottomTabNavigator } from './BottomTabNavigator';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../theme';

// Common types for navigation parameters
export interface Product {
  name: string;
  type: string;
  qty: number;
  color?: string;
  estPriceUSD?: number;
  keywords: string[];
  placement?: {
    note?: string;
    bboxNorm?: number[];
  };
  amazonLink?: string;
}

export interface CleaningStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  estimatedTime?: string;
}

export type RootStackParamList = {
  MainTabs: { screen?: string } | undefined;
  Home: undefined;
  ServiceSelection: undefined;
  Design: undefined;
  Declutter: undefined;
  Makeover: undefined;
  Search: { keywords: string[] };
  Result: { 
    generatedImage: string;
    originalImage: string;
    products?: Product[];
    cleaningSteps?: CleaningStep[];
    designId?: string;
    description: string;
    serviceType?: 'design' | 'makeover' | 'declutter';
  };
  SavedDesigns: undefined;
  Settings: undefined;
  Login: undefined;
  Signup: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const LoadingScreen = () => {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background.primary }]}>
      <ActivityIndicator size="large" color={theme.colors.primary.main} />
    </View>
  );
};

export const AppNavigator = () => {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="MainTabs"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#121212',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {/* Main Navigation */}
        <Stack.Screen 
          name="MainTabs" 
          component={BottomTabNavigator} 
          options={{ headerShown: false }}
        />
        
        {/* Service Screens */}
        <Stack.Screen 
          name="ServiceSelection" 
          component={ServiceSelectionScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Design" 
          component={DesignScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Declutter" 
          component={DeclutterScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Makeover" 
          component={MakeoverScreen} 
          options={{ headerShown: false }}
        />
        
        {/* Result and Search Screens */}
        <Stack.Screen 
          name="Result" 
          component={ResultScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Search" 
          component={SearchScreen} 
          options={{ title: 'Find Products' }}
        />
        
        {/* Auth Screens */}
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ title: 'Sign In' }}
        />
        <Stack.Screen 
          name="Signup" 
          component={SignupScreen} 
          options={{ title: 'Create Account' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
