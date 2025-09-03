import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { HomeScreen } from '../screens/HomeScreen';
import { DesignScreen } from '../screens/DesignScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { ResultScreen } from '../screens/ResultScreen';

export type RootStackParamList = {
  Home: undefined;
  Design: undefined;
  Search: { keywords: string[] };
  Result: { 
    generatedImage: string;
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
};

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Home"
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
          name="Home" 
          component={HomeScreen} 
          options={{ title: 'SnapDesign' }}
        />
        <Stack.Screen 
          name="Design" 
          component={DesignScreen} 
          options={{ title: 'Generate Design' }}
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
