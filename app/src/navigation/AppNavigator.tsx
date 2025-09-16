import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { SearchScreen } from '../screens/SearchScreen';
import { ResultScreen } from '../screens/ResultScreen';
import { LoginScreen, SignupScreen } from '../screens';
import { BottomTabNavigator } from './BottomTabNavigator';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../theme';

export type RootStackParamList = {
  MainTabs: { screen?: string } | undefined;
  Home: undefined;
  Design: undefined;
  Search: { keywords: string[] };
  Result: { 
    generatedImage: string;
    originalImage: string;
    products: Array<{
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
    }>;
    designId?: string;
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
        <Stack.Screen 
          name="MainTabs" 
          component={BottomTabNavigator} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Search" 
          component={SearchScreen} 
          options={{ title: 'Find Products' }}
        />
        <Stack.Screen 
          name="Result" 
          component={ResultScreen} 
          options={{ headerShown: false }}
        />
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
