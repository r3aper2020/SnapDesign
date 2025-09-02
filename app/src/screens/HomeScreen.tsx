import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import { useTheme } from '../theme';
import { ExampleComponent } from '../components';

interface HomeScreenProps {
  navigation?: any; // You can replace 'any' with proper navigation types when you add navigation
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { theme, isDark, toggleTheme } = useTheme();
  
  const handlePress = () => {
    console.log('Button pressed!');
    // Add navigation logic here when you implement navigation
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.text.primary }]}>
          Welcome to SnapDesign
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
          Your React Native + TypeScript App
        </Text>
        
        <View style={[styles.infoContainer, { 
          backgroundColor: theme.colors.background.primary,
          ...theme.shadows.components.card
        }]}>
          <Text style={[styles.infoText, { color: theme.colors.text.secondary }]}>
            This is your home screen. Start building your app here!
          </Text>
        </View>

        <ExampleComponent 
          title="Theme System Working!"
          description="This component uses the same theme system as the rest of the app."
        />

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, { 
              backgroundColor: theme.colors.primary.main,
              ...theme.shadows.components.button
            }]} 
            onPress={handlePress}
          >
            <Text style={[styles.buttonText, { color: theme.colors.primary.contrast }]}>
              Get Started
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.themeButton, { 
              backgroundColor: theme.colors.secondary.main,
              ...theme.shadows.components.button
            }]} 
            onPress={toggleTheme}
          >
            <Text style={[styles.buttonText, { color: theme.colors.secondary.contrast }]}>
              {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
  },
  infoContainer: {
    padding: 20,
    borderRadius: 10,
    marginBottom: 30,
  },
  infoText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  button: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  themeButton: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 25,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
