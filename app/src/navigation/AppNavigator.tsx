import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SearchScreen } from '../screens/SearchScreen';
import { ResultScreen } from '../screens/ResultScreen';
import { BottomTabNavigator } from './BottomTabNavigator';

export type RootStackParamList = {
  MainTabs: undefined;
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
  };
  SavedDesigns: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="MainTabs"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1a1a1a',
          },
          headerTintColor: '#ffffff',
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
          options={{ title: 'Your Design' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
