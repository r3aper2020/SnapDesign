import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { useAuth } from '../contexts/AuthContext';
import { HomeScreen } from '../screens/HomeScreen';
import { ServiceSelectionScreen } from '../screens/ServiceSelectionScreen';
import { SavedDesignsScreen } from '../screens/SavedDesignsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { RootStackParamList } from './AppNavigator';

const Tab = createBottomTabNavigator<RootStackParamList>();

// Custom Icon Components
const HomeIcon = ({ size = 24, color = '#666', focused = false }) => (
  <View style={[styles.iconContainer, { backgroundColor: focused ? color + '20' : 'transparent' }]}>
    <View style={[styles.iconBase, { width: size, height: size }]}>
      <View style={[styles.houseRoof, { borderBottomColor: color }]} />
      <View style={[styles.houseBase, { backgroundColor: color }]} />
      <View style={[styles.houseDoor, { backgroundColor: color }]} />
    </View>
  </View>
);

const DesignIcon = ({ size = 24, color = '#666', focused = false }) => (
  <View style={[styles.iconContainer, { backgroundColor: focused ? color + '20' : 'transparent' }]}>
    <View style={[styles.iconBase, { width: size, height: size }]}>
      <View style={[styles.paletteBase, { backgroundColor: color }]} />
      <View style={[styles.paletteBrush, { backgroundColor: color }]} />
      <View style={[styles.paletteDot1, { backgroundColor: color }]} />
      <View style={[styles.paletteDot2, { backgroundColor: color }]} />
      <View style={[styles.paletteDot3, { backgroundColor: color }]} />
    </View>
  </View>
);

const SavedIcon = ({ size = 24, color = '#666', focused = false }) => (
  <View style={[styles.iconContainer, { backgroundColor: focused ? color + '20' : 'transparent' }]}>
    <View style={[styles.iconBase, { width: size, height: size }]}>
      <View style={[styles.bookmarkBase, { backgroundColor: color }]} />
      <View style={[styles.bookmarkFold, { borderBottomColor: color }]} />
    </View>
  </View>
);

const SettingsIcon = ({ size = 24, color = '#666', focused = false }) => (
  <View style={[styles.iconContainer, { backgroundColor: focused ? color + '20' : 'transparent' }]}>
    <View style={[styles.iconBase, { width: size, height: size }]}>
      <View style={[styles.settingsGear, { borderColor: color }]} />
      <View style={[styles.settingsDot1, { backgroundColor: color }]} />
      <View style={[styles.settingsDot2, { backgroundColor: color }]} />
      <View style={[styles.settingsDot3, { backgroundColor: color }]} />
    </View>
  </View>
);

const AuthRequiredScreen: React.FC<{ children: React.ReactNode; navigation: any }> = ({ children, navigation }) => {
  const { isAuthenticated } = useAuth();
  const { theme } = useTheme();

  if (!isAuthenticated) {
    return (
      <View style={[styles.authRequiredContainer, { backgroundColor: theme.colors.background.primary }]}>
        <Text style={[styles.authRequiredText, { color: theme.colors.text.primary }]}>
          Please sign in to access this feature
        </Text>
        <TouchableOpacity
          style={[styles.authButton, { backgroundColor: theme.colors.button.primary }]}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={[styles.authButtonText, { color: theme.colors.text.primary }]}>
            Sign In
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
};

export const BottomTabNavigator: React.FC = () => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, logout } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          switch (route.name) {
            case 'Home':
              return <HomeIcon size={size} color={color} focused={focused} />;
            case 'Design':
              return <DesignIcon size={size} color={color} focused={focused} />;
            case 'SavedDesigns':
              return <SavedIcon size={size} color={color} focused={focused} />;
            case 'Settings':
              return <SettingsIcon size={size} color={color} focused={focused} />;
            default:
              return null;
          }
        },
        tabBarActiveTintColor: theme.colors.primary.main,
        tabBarInactiveTintColor: theme.colors.text.secondary,
        tabBarStyle: {
          backgroundColor: theme.colors.background.primary,
          borderTopWidth: 0,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
          height: 70 + Math.max(insets.bottom - 8, 0),
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.4,
          shadowRadius: 20,
          elevation: 16,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen
        name="Design"
        options={{
          tabBarLabel: 'Create',
        }}
      >
        {({ navigation }) => (
          <AuthRequiredScreen navigation={navigation}>
            <ServiceSelectionScreen navigation={navigation} />
          </AuthRequiredScreen>
        )}
      </Tab.Screen>
      <Tab.Screen
        name="SavedDesigns"
        options={{
          tabBarLabel: 'Saved',
        }}
      >
        {({ navigation }) => (
          <AuthRequiredScreen navigation={navigation}>
            <SavedDesignsScreen navigation={navigation} />
          </AuthRequiredScreen>
        )}
      </Tab.Screen>
      <Tab.Screen
        name="Settings"
        options={{
          tabBarLabel: isAuthenticated ? 'Account' : 'Settings',
        }}
      >
        {({ navigation }) => <SettingsScreen navigation={navigation} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  authRequiredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authRequiredText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  authButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  authButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBase: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Home Icon Styles
  houseRoof: {
    width: 16,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginBottom: 2,
  },
  houseBase: {
    width: 16,
    height: 10,
    borderRadius: 2,
  },
  houseDoor: {
    position: 'absolute',
    bottom: 0,
    width: 4,
    height: 6,
    borderRadius: 1,
  },

  // Design Icon Styles (Palette)
  paletteBase: {
    width: 16,
    height: 12,
    borderRadius: 8,
    position: 'relative',
  },
  paletteBrush: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 3,
    height: 8,
    borderRadius: 1.5,
    transform: [{ rotate: '45deg' }],
  },
  paletteDot1: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  paletteDot2: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  paletteDot3: {
    position: 'absolute',
    bottom: 2,
    left: 6,
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },

  // Saved Icon Styles (Bookmark)
  bookmarkBase: {
    width: 12,
    height: 16,
    borderRadius: 2,
  },
  bookmarkFold: {
    position: 'absolute',
    top: 0,
    left: 10,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
  },

  // Settings Icon Styles (Gear)
  settingsGear: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  settingsDot1: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  settingsDot2: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  settingsDot3: {
    position: 'absolute',
    bottom: 2,
    left: 6,
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
});
