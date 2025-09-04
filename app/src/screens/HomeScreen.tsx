import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

const { width } = Dimensions.get('window');

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();

  const handleFindProducts = () => {
    navigation.navigate('Search', { keywords: ['home decor', 'furniture', 'accessories'] });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroContent}>
            <Text style={[styles.heroTitle, { color: theme.colors.text.primary }]}>
              SnapDesign
            </Text>
            <Text style={[styles.heroSubtitle, { color: theme.colors.text.secondary }]}>
              Transform any room with AI-powered design and get product recommendations
            </Text>
          </View>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            What you can do
          </Text>
          
          <View style={styles.featuresGrid}>
            <View style={[styles.featureCard, { backgroundColor: theme.colors.background.secondary }]}>
              <Text style={[styles.featureTitle, { color: theme.colors.text.primary }]}>
                AI Design Generation
              </Text>
              <Text style={[styles.featureDescription, { color: theme.colors.text.secondary }]}>
                Upload a photo and let AI transform it with your chosen theme
              </Text>
            </View>

            <View style={[styles.featureCard, { backgroundColor: theme.colors.background.secondary }]}>
              <Text style={[styles.featureTitle, { color: theme.colors.text.primary }]}>
                Product Recommendations
              </Text>
              <Text style={[styles.featureDescription, { color: theme.colors.text.secondary }]}>
                Get curated product suggestions with Amazon links
              </Text>
            </View>

            <View style={[styles.featureCard, { backgroundColor: theme.colors.background.secondary }]}>
              <Text style={[styles.featureTitle, { color: theme.colors.text.primary }]}>
                Smart Search
              </Text>
              <Text style={[styles.featureDescription, { color: theme.colors.text.secondary }]}>
                Find similar products and alternatives easily
              </Text>
            </View>

            <View style={[styles.featureCard, { backgroundColor: theme.colors.background.secondary }]}>
              <Text style={[styles.featureTitle, { color: theme.colors.text.primary }]}>
                Mobile Optimized
              </Text>
              <Text style={[styles.featureDescription, { color: theme.colors.text.secondary }]}>
                Designed for mobile with intuitive touch controls
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Quick Actions
          </Text>
          
          <TouchableOpacity
            style={[styles.quickActionButton, { 
              backgroundColor: theme.colors.background.secondary,
              borderColor: theme.colors.border.light 
            }]}
            onPress={handleFindProducts}
          >
            <Text style={[styles.quickActionText, { color: theme.colors.text.primary }]}>
              🔍 Find Products
            </Text>
            <Text style={[styles.quickActionSubtext, { color: theme.colors.text.secondary }]}>
              Search for home decor items
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info Section */}
        <View style={[styles.infoCard, { backgroundColor: theme.colors.background.secondary }]}>
          <Text style={[styles.infoTitle, { color: theme.colors.text.primary }]}>
            How it works
          </Text>
          <Text style={[styles.infoText, { color: theme.colors.text.secondary }]}>
            1. Take or upload a photo of your space{'\n'}
            2. Choose a design theme (halloween, christmas, modern, etc.){'\n'}
            3. AI generates a transformed image{'\n'}
            4. Get product recommendations with Amazon links{'\n'}
            5. Shop and transform your space!
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 48,
    paddingTop: 40,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -1,
  },
  heroSubtitle: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: width - 80,
    opacity: 0.8,
  },
  featuresSection: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  featuresGrid: {
    gap: 16,
  },
  featureCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  featureDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.7,
  },
  actionsSection: {
    marginBottom: 40,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  quickActionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  quickActionText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  quickActionSubtext: {
    fontSize: 14,
    opacity: 0.7,
  },
  infoCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.8,
  },
});
