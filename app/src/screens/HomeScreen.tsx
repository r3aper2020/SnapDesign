import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions,
  StyleSheet,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeProvider';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

const { width } = Dimensions.get('window');

// Sample images for cycling - add any images to the Samples folder and they'll automatically appear
const sampleImages = [
  require('../../assets/Samples/Christmas.png'),
  require('../../assets/Samples/Holloween.png'),
  require('../../assets/Samples/ThanksGiving.png'),
  require('../../assets/Samples/BirthDay.png'),
  require('../../assets/Samples/AccentWall.png'),
  require('../../assets/Samples/FootballParty.png'),
  // Add more images here as you drop them into the Samples folder
  // require('../../assets/Samples/YourNewImage.png'),
];

// Generic content that stays the same
const heroTitle = 'ReVibe your Space';
const heroDescription = 'Transform any space with AI-powered creativity';

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
  
  // Image cycling state
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Auto-cycle through images every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        (prevIndex + 1) % sampleImages.length
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleDesignWithTheme = () => {
    navigation.navigate('Design');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      {/* Background Image */}
      <Image 
        source={require('../../assets/background.png')} 
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ReVibe Header */}
        <View style={styles.headerSection}>
          <Image 
            source={require('../../assets/re-vibe.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.appSubtitle, { color: theme.colors.text.secondary }]}>
            AI-Powered Design Studio
          </Text>
        </View>

        {/* Hero Banner with Cycling Images */}
        <View style={styles.heroBanner}>
          <LinearGradient
            colors={theme.colors.gradient.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={styles.heroContent}>
              {/* Sample Image Display */}
              <View style={styles.sampleImageContainer}>
                <Image 
                  source={sampleImages[currentImageIndex]} 
                  style={styles.sampleImage}
                  resizeMode="cover"
                />
              </View>
              
              <Text style={[styles.heroTitle, { color: theme.colors.text.primary }]}>
                {heroTitle}
              </Text>
              <Text style={[styles.heroSubtitle, { color: theme.colors.text.primary }]}>
                {heroDescription}
              </Text>
              
              {/* Image indicators */}
              <View style={styles.imageIndicators}>
                {sampleImages.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.indicator,
                      {
                        backgroundColor: index === currentImageIndex 
                          ? 'rgba(255, 255, 255, 0.9)' 
                          : 'rgba(255, 255, 255, 0.3)'
                      }
                    ]}
                  />
                ))}
              </View>
              
              <TouchableOpacity
                style={styles.heroButton}
                onPress={handleDesignWithTheme}
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.1)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.heroButtonGradient}
                >
                  <Text style={[styles.heroButtonText, { color: theme.colors.text.primary }]}>
                    Start Creating
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* This Month's Popular Theme */}
        <View style={styles.themeSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            This Month's Popular Design Theme
          </Text>
          
          <TouchableOpacity
            style={[styles.themeCard, { backgroundColor: theme.colors.background.secondary }]}
            onPress={handleDesignWithTheme}
          >
            <View style={styles.themeImageContainer}>
              <Image 
                source={require('../../assets/Themes/September.png')} 
                style={styles.themeImage}
                resizeMode="cover"
              />
            </View>
            <View style={styles.themeContent}>
              <Text style={[styles.themeTitle, { color: theme.colors.text.primary }]}>
                September Theme
              </Text>
              <Text style={[styles.themeDescription, { color: theme.colors.text.secondary }]}>
                Get ready for the school year with organized, inspiring study spaces
              </Text>
            </View>
          </TouchableOpacity>
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
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  // Header Section
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 20,
  },
  logo: {
    width: 210,
    height: 210,
    marginTop: -52.5, // Crop 25% from top (210 * 0.25 = 52.5)
    marginBottom: -52.5, // Crop 25% from bottom (210 * 0.25 = 52.5)
    overflow: 'hidden',
  },
  appSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
    fontWeight: '500',
    marginTop: -5,
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
    padding: 16,
    paddingTop: 24,
  },
  heroContent: {
    alignItems: 'center',
  },
  // Sample Image Styles
  sampleImageContainer: {
    width: 280,
    height: 280,
    borderRadius: 20,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  sampleImage: {
    width: '100%',
    height: '100%',
  },
  // Image Indicators
  imageIndicators: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.8,
  },
  heroSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.8,
    marginBottom: 12,
  },
  heroButton: {
    borderRadius: 28,
    shadowColor: '#FF6A3D',
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
  // Theme Section
  themeSection: {
    marginBottom: 40,
  },
  themeCard: {
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  themeImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 16,
  },
  themeImage: {
    width: '100%',
    height: '100%',
  },
  themeContent: {
    flex: 1,
  },
  themeTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  themeDescription: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
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
