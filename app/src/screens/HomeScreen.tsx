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
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeProvider';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

const { width } = Dimensions.get('window');

// Professional Icon Components
const CameraIcon = ({ size = 24, color = '#666' }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{
      width: size * 0.8,
      height: size * 0.6,
      borderWidth: 2,
      borderColor: color,
      borderRadius: size * 0.1,
      backgroundColor: 'transparent',
    }}>
      <View style={{
        position: 'absolute',
        top: -size * 0.15,
        right: -size * 0.1,
        width: size * 0.3,
        height: size * 0.2,
        borderWidth: 2,
        borderColor: color,
        borderRadius: size * 0.05,
        backgroundColor: 'transparent',
      }} />
      <View style={{
        position: 'absolute',
        top: size * 0.15,
        left: size * 0.2,
        width: size * 0.15,
        height: size * 0.15,
        borderRadius: size * 0.075,
        backgroundColor: color,
      }} />
    </View>
  </View>
);

const PaletteIcon = ({ size = 24, color = '#666' }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{
      width: size * 0.7,
      height: size * 0.5,
      backgroundColor: color,
      borderRadius: size * 0.35,
      position: 'relative',
    }}>
      <View style={{
        position: 'absolute',
        top: size * 0.1,
        left: size * 0.1,
        width: size * 0.1,
        height: size * 0.1,
        borderRadius: size * 0.05,
        backgroundColor: 'white',
      }} />
      <View style={{
        position: 'absolute',
        top: size * 0.1,
        right: size * 0.1,
        width: size * 0.1,
        height: size * 0.1,
        borderRadius: size * 0.05,
        backgroundColor: 'white',
      }} />
      <View style={{
        position: 'absolute',
        bottom: size * 0.1,
        left: size * 0.3,
        width: size * 0.1,
        height: size * 0.1,
        borderRadius: size * 0.05,
        backgroundColor: 'white',
      }} />
    </View>
  </View>
);

const SparkleIcon = ({ size = 24, color = '#666' }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{
      width: size * 0.3,
      height: size * 0.3,
      backgroundColor: color,
      borderRadius: size * 0.15,
      position: 'absolute',
    }} />
    <View style={{
      width: size * 0.6,
      height: 2,
      backgroundColor: color,
      position: 'absolute',
      transform: [{ rotate: '45deg' }],
    }} />
    <View style={{
      width: size * 0.6,
      height: 2,
      backgroundColor: color,
      position: 'absolute',
      transform: [{ rotate: '-45deg' }],
    }} />
  </View>
);

const ShoppingIcon = ({ size = 24, color = '#666' }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{
      width: size * 0.8,
      height: size * 0.6,
      borderWidth: 2,
      borderColor: color,
      borderRadius: size * 0.1,
      backgroundColor: 'transparent',
    }}>
      <View style={{
        position: 'absolute',
        top: -size * 0.1,
        right: size * 0.1,
        width: size * 0.2,
        height: size * 0.15,
        borderWidth: 2,
        borderColor: color,
        borderRadius: size * 0.05,
        backgroundColor: 'transparent',
      }} />
      <View style={{
        position: 'absolute',
        bottom: size * 0.1,
        left: size * 0.1,
        width: size * 0.15,
        height: size * 0.15,
        borderRadius: size * 0.075,
        backgroundColor: color,
      }} />
    </View>
  </View>
);

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();

  // Get current month for seasonal themes
  const getCurrentSeasonalTheme = () => {
    const month = new Date().getMonth() + 1; // 1-12
    const themes = {
      1: { name: 'New Year', emoji: '🎊', color: '#FFD700', description: 'Fresh starts and golden moments' },
      2: { name: 'Valentine\'s', emoji: '💕', color: '#FF69B4', description: 'Love and romance in every corner' },
      3: { name: 'Spring', emoji: '🌸', color: '#FFB6C1', description: 'Fresh blooms and renewal' },
      4: { name: 'Easter', emoji: '🐰', color: '#98FB98', description: 'Pastel perfection and new beginnings' },
      5: { name: 'Spring Garden', emoji: '🌺', color: '#FFA07A', description: 'Floral beauty and growth' },
      6: { name: 'Summer', emoji: '☀️', color: '#FFA500', description: 'Bright and vibrant energy' },
      7: { name: 'Independence', emoji: '🇺🇸', color: '#FF0000', description: 'Patriotic pride and celebration' },
      8: { name: 'Summer Vibes', emoji: '🏖️', color: '#87CEEB', description: 'Beach house and coastal living' },
      9: { name: 'Back to School', emoji: '📚', color: '#9370DB', description: 'Study spaces and organization' },
      10: { name: 'Halloween', emoji: '🎃', color: '#FF8C00', description: 'Spooky and mysterious atmosphere' },
      11: { name: 'Thanksgiving', emoji: '🦃', color: '#D2691E', description: 'Warm and cozy gatherings' },
      12: { name: 'Christmas', emoji: '🎄', color: '#228B22', description: 'Festive magic and holiday cheer' }
    };
    return themes[month as keyof typeof themes] || themes[1];
  };

  const seasonalTheme = getCurrentSeasonalTheme();


  const handleDesignWithTheme = () => {
    navigation.navigate('Design');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <LinearGradient
            colors={[seasonalTheme.color + '20', seasonalTheme.color + '10', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={styles.heroContent}>
              <Text style={styles.heroEmoji}>{seasonalTheme.emoji}</Text>
              <Text style={[styles.heroTitle, { color: theme.colors.text.primary }]}>
                {seasonalTheme.name} Design Studio
              </Text>
              <Text style={[styles.heroSubtitle, { color: theme.colors.text.secondary }]}>
                {seasonalTheme.description}
              </Text>
              <TouchableOpacity
                style={styles.heroButton}
                onPress={handleDesignWithTheme}
              >
                <LinearGradient
                  colors={theme.colors.gradient.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.heroButtonGradient}
                >
                  <Text style={[styles.heroButtonText, { color: theme.colors.text.primary }]}>
                    Create {seasonalTheme.name} Design
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Featured Categories */}
        <View style={styles.categoriesSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Popular Design Styles
          </Text>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            {[
              { emoji: '🏠', name: 'Modern', description: 'Clean & minimal' },
              { emoji: '🌿', name: 'Bohemian', description: 'Natural & eclectic' },
              { emoji: '🏛️', name: 'Classic', description: 'Timeless elegance' },
              { emoji: '⚡', name: 'Industrial', description: 'Raw & urban' },
              { emoji: '🌸', name: 'Scandinavian', description: 'Cozy & bright' },
              { emoji: '🌴', name: 'Tropical', description: 'Vibrant & lush' }
            ].map((category, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.categoryCard, { backgroundColor: theme.colors.background.secondary }]}
                onPress={handleDesignWithTheme}
              >
                <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                <Text style={[styles.categoryName, { color: theme.colors.text.primary }]}>
                  {category.name}
                </Text>
                <Text style={[styles.categoryDescription, { color: theme.colors.text.secondary }]}>
                  {category.description}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>


        {/* How it Works Section */}
        <View style={styles.howItWorksSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            How it works
          </Text>
          
          <View style={styles.stepsContainer}>
            {[
              { 
                step: '1', 
                icon: 'CameraIcon', 
                title: 'Upload Photo', 
                description: 'Take or upload a photo of your space' 
              },
              { 
                step: '2', 
                icon: 'PaletteIcon', 
                title: 'Choose Theme', 
                description: 'Select a design style or seasonal theme' 
              },
              { 
                step: '3', 
                icon: 'SparkleIcon', 
                title: 'AI Magic', 
                description: 'Watch AI transform your space' 
              },
              { 
                step: '4', 
                icon: 'ShoppingIcon', 
                title: 'Shop Products', 
                description: 'Get curated product recommendations' 
              }
            ].map((item, index) => (
              <View key={index} style={styles.stepItem}>
                <View style={[styles.stepNumber, { backgroundColor: theme.colors.background.secondary }]}>
                  <Text style={[styles.stepNumberText, { color: theme.colors.text.primary }]}>
                    {item.step}
                  </Text>
                </View>
                <View style={styles.stepContent}>
                  <View style={styles.stepIconContainer}>
                    {item.icon === 'CameraIcon' && <CameraIcon size={24} color={theme.colors.primary.main} />}
                    {item.icon === 'PaletteIcon' && <PaletteIcon size={24} color={theme.colors.primary.main} />}
                    {item.icon === 'SparkleIcon' && <SparkleIcon size={24} color={theme.colors.primary.main} />}
                    {item.icon === 'ShoppingIcon' && <ShoppingIcon size={24} color={theme.colors.primary.main} />}
                  </View>
                  <Text style={[styles.stepTitle, { color: theme.colors.text.primary }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.stepDescription, { color: theme.colors.text.secondary }]}>
                    {item.description}
                  </Text>
                </View>
                {index < 3 && (
                  <View style={[styles.stepConnector, { backgroundColor: theme.colors.border.light }]} />
                )}
              </View>
            ))}
          </View>
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
  // Hero Banner Styles
  heroBanner: {
    marginBottom: 32,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  heroGradient: {
    padding: 32,
    paddingTop: 40,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.8,
  },
  heroSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.8,
    marginBottom: 24,
  },
  heroButton: {
    borderRadius: 28,
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  heroButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 28,
    alignItems: 'center',
  },
  heroButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  // Categories Section
  categoriesSection: {
    marginBottom: 40,
  },
  categoriesScroll: {
    paddingHorizontal: 4,
  },
  categoryCard: {
    width: 140,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  categoryEmoji: {
    fontSize: 32,
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.7,
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
  // How it Works Section
  howItWorksSection: {
    marginBottom: 40,
  },
  stepsContainer: {
    gap: 24,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  stepNumberText: {
    fontSize: 18,
    fontWeight: '800',
  },
  stepContent: {
    flex: 1,
    paddingTop: 2,
  },
  stepIconContainer: {
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
  stepConnector: {
    position: 'absolute',
    left: 19,
    top: 40,
    width: 2,
    height: 24,
    opacity: 0.3,
  },
});
