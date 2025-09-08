import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  TextInput,
  Dimensions,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../theme/ThemeProvider';
import { endpoints } from '../config/api';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { designStorage } from '../services/DesignStorage';

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

const DiceIcon = ({ size = 24, color = '#666' }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{
      width: size * 0.8,
      height: size * 0.8,
      borderWidth: 2,
      borderColor: color,
      borderRadius: size * 0.1,
      backgroundColor: 'transparent',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <View style={{
        width: size * 0.1,
        height: size * 0.1,
        borderRadius: size * 0.05,
        backgroundColor: color,
        marginBottom: size * 0.05,
      }} />
      <View style={{
        width: size * 0.1,
        height: size * 0.1,
        borderRadius: size * 0.05,
        backgroundColor: color,
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

type DesignScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Design'>;

interface DesignScreenProps {
  navigation: DesignScreenNavigationProp;
}

export const DesignScreen: React.FC<DesignScreenProps> = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [description, setDescription] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Popular design ideas for inspiration
  const popularIdeas = [
    // Holiday & Seasonal
    'Decorate this space for Christmas with lights and ornaments',
    'Add Halloween decorations and spooky elements',
    'Create a cozy Thanksgiving atmosphere with fall colors',
    'Add Easter decorations and spring elements',
    
    // Simple Additions
    'Add a plant in the corner with a nice pot',
    'Place a reading chair by the window',
    'Add some artwork on the walls',
    'Put a small table and lamp in the corner',
    
    // Room Transformations
    'Transform into a cozy home office with plants and good lighting',
    'Create a Japanese zen garden with koi pond and bamboo',
    'Design a modern kitchen with island and pendant lights',
    'Make this a children\'s playroom with storage and bright colors',
    
    // Outdoor & Patio
    'Create a Mediterranean patio with terracotta pots and string lights',
    'Add outdoor seating and string lights for evening ambiance',
    'Design a vegetable garden with raised beds and trellises',
    'Create a cozy outdoor dining area with plants',
    
    // Style & Aesthetic
    'Design a Scandinavian living room with light wood and plants',
    'Make this a bohemian bedroom with macrame and plants',
    'Create an industrial loft with exposed brick and metal accents',
    'Design a minimalist space with clean lines and neutral colors',
    
    // Functional Spaces
    'Transform into a home gym with mirrors and equipment',
    'Create a craft room with storage and work surfaces',
    'Design a wine cellar with racks and tasting area',
    'Make this a home library with bookshelves and reading nook'
  ];

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      console.log('📸 Selected image:', {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        fileSize: asset.fileSize,
        mimeType: asset.mimeType
      });
      
      // Try to get base64 data, fallback to URI if base64 is not available
      if (asset.base64) {
        setSelectedImage(asset.base64);
        console.log('✅ Using base64 data, length:', asset.base64.length);
      } else if (asset.uri) {
        // Convert URI to base64 if needed
        try {
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result as string;
            const cleanBase64 = base64.split(',')[1]; // Remove data URL prefix
            setSelectedImage(cleanBase64);
            console.log('✅ Converted URI to base64, length:', cleanBase64.length);
          };
          reader.readAsDataURL(blob);
        } catch (error) {
          console.error('❌ Error converting URI to base64:', error);
          Alert.alert('Error', 'Failed to process the selected image');
        }
      } else {
        Alert.alert('Error', 'No image data available');
      }
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access your camera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      console.log('📷 Camera photo:', {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        fileSize: asset.fileSize,
        mimeType: asset.mimeType
      });
      
      // Try to get base64 data, fallback to URI if base64 is not available
      if (asset.base64) {
        setSelectedImage(asset.base64);
        console.log('✅ Using camera base64 data, length:', asset.base64.length);
      } else if (asset.uri) {
        // Convert URI to base64 if needed
        try {
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result as string;
            const cleanBase64 = base64.split(',')[1]; // Remove data URL prefix
            setSelectedImage(cleanBase64);
            console.log('✅ Converted camera URI to base64, length:', cleanBase64.length);
          };
          reader.readAsDataURL(blob);
        } catch (error) {
          console.error('❌ Error converting camera URI to base64:', error);
          Alert.alert('Error', 'Failed to process the captured photo');
        }
      } else {
        Alert.alert('Error', 'No photo data available');
      }
    }
  };

  const handleGenerateDesign = async () => {
    if (!selectedImage || !description.trim()) {
      Alert.alert('Error', 'Please select an image and describe what you want to create');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // First check if server is reachable
      try {
        const healthResponse = await fetch(endpoints.health());
        if (!healthResponse.ok) {
          throw new Error('Server not responding');
        }
      } catch (healthError) {
        throw new Error('Cannot connect to server. Make sure the API server is running on port 4000.');
      }
      
      if (!selectedImage || selectedImage.length < 1000) {
        throw new Error('Please select a valid image first');
      }

      const requestBody = {
        imageBase64: selectedImage,
        description: description.trim(),
        mimeType: 'image/jpeg'
      };
      
      console.log('🚀 Sending design request:', {
        description: requestBody.description,
        imageSize: requestBody.imageBase64.length,
        mimeType: requestBody.mimeType
      });
      
      const response = await fetch(endpoints.decorate(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // Could not parse error response
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      console.log('🎨 Design response received:', {
        hasEditedImage: !!data.editedImageBase64,
        editedImageSize: data.editedImageBase64?.length || 0,
        productsCount: data.products?.items?.length || data.products?.length || 0,
        products: data.products?.items || data.products,
        tokenUsage: data.tokenUsage
      });

      if (data.editedImageBase64 && data.products) {
        // Save the design locally
        try {
          await designStorage.saveDesign({
            description: description.trim(),
            originalImage: selectedImage,
            generatedImage: data.editedImageBase64,
            products: data.products.items || data.products,
            tokenUsage: data.tokenUsage
          });
          console.log('💾 Design saved successfully');
        } catch (saveError) {
          console.error('❌ Error saving design:', saveError);
          // Continue to result screen even if saving fails
        }

        navigation.navigate('Result', {
          generatedImage: data.editedImageBase64,
          originalImage: selectedImage,
          products: data.products.items || data.products
        });
      } else {
        throw new Error('Invalid response format from server');
      }

    } catch (err: any) {
      setError(err.message || 'Failed to generate design');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      {/* Fixed Header */}
      <View style={[styles.fixedHeader, { backgroundColor: theme.colors.background.primary }]}>
        <Image 
          source={require('../../assets/re-vibe.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={[styles.title, { color: theme.colors.text.primary }]}>
          Design Studio
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
          Transform any space with AI-powered design
        </Text>
      </View>
      
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >

        {/* Hero Image Section */}
        <View style={styles.heroSection}>
          {selectedImage ? (
            <View style={styles.imageContainer}>
              <Image 
                source={{ uri: `data:image/jpeg;base64,${selectedImage}` }} 
                style={styles.heroImage} 
                resizeMode="cover"
                fadeDuration={0}
              />
              <View style={styles.imageOverlay}>
                <TouchableOpacity 
                  style={styles.changeImageButton}
                  onPress={pickImage}
                >
                  <Text style={styles.changeImageText}>Change Photo</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={[styles.uploadArea, { borderColor: theme.colors.border.light }]}>
              <View style={styles.uploadIcon}>
                <CameraIcon size={48} color={theme.colors.text.secondary} />
              </View>
              <Text style={[styles.uploadTitle, { color: theme.colors.text.primary }]}>
                Upload Your Space
              </Text>
              <Text style={[styles.uploadSubtitle, { color: theme.colors.text.secondary }]}>
                Take a photo or choose from your gallery
              </Text>
              <View style={styles.uploadButtons}>
                <TouchableOpacity 
                  style={[styles.uploadButton, { backgroundColor: theme.colors.secondary.main }]}
                  onPress={pickImage}
                >
                  <Text style={[styles.uploadButtonText, { color: theme.colors.secondary.contrast }]}>
                    Choose Photo
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.uploadButton, styles.uploadButtonSecondary, { borderColor: theme.colors.accent.purple }]}
                  onPress={takePhoto}
                >
                  <Text style={[styles.uploadButtonText, { color: theme.colors.accent.purple }]}>
                    Take Photo
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Design Input Section */}
        <View style={styles.inputSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            What do you want to create?
          </Text>
          
          <View style={styles.inputWrapper}>
            <View style={[styles.inputContainer, { 
              backgroundColor: theme.colors.background.secondary,
              borderColor: theme.colors.border.light 
            }]}>
              <TextInput
                style={[styles.designInput, { 
                  color: theme.colors.text.primary,
                }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe your design vision... e.g., 'Transform this into a modern home office with plants and natural lighting'"
                placeholderTextColor={theme.colors.text.secondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            
            {/* Floating Random Idea Button */}
            <TouchableOpacity
              style={[styles.floatingRandomButton, { 
                backgroundColor: theme.colors.secondary.main,
                shadowColor: theme.colors.secondary.main,
              }]}
              onPress={() => {
                const randomIndex = Math.floor(Math.random() * popularIdeas.length);
                setDescription(popularIdeas[randomIndex]);
              }}
            >
              <DiceIcon size={16} color={theme.colors.secondary.contrast} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Generate Button */}
        <TouchableOpacity
          style={styles.generateButton}
          onPress={handleGenerateDesign}
          disabled={!selectedImage || !description.trim() || isGenerating}
        >
          <LinearGradient
            colors={theme.colors.gradient.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientGenerateButton}
          >
            {isGenerating ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={theme.colors.text.primary} size="small" />
                <Text style={[styles.loadingText, { color: theme.colors.text.primary }]}>
                  Creating your design...
                </Text>
              </View>
            ) : (
              <View style={styles.generateButtonContent}>
                <SparkleIcon size={20} color={theme.colors.text.primary} />
                <Text style={[styles.generateButtonText, { color: theme.colors.text.primary }]}>
                  Generate Design
                </Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Error Display */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  
  // Fixed Header Section
  fixedHeader: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  logo: {
    width: 120,
    height: 120,
    marginTop: -30, // Crop 25% from top (120 * 0.25 = 30)
    marginBottom: -28, // Crop 25% from bottom (120 * 0.25 = 30) + original 2 margin
    overflow: 'hidden',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.7,
    maxWidth: width - 80,
  },

  // Hero Section
  heroSection: {
    marginBottom: 24,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
    height: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 20,
  },
  changeImageButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  changeImageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Upload Area - Modern dark design
  uploadArea: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 28,
    padding: 40,
    paddingHorizontal: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    position: 'relative',
    overflow: 'hidden',
  },
  uploadIcon: {
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  uploadSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
  },
  uploadButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '80%',
    alignSelf: 'center',
  },
  uploadButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 36,
  },
  uploadButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Input Section
  inputSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  inputWrapper: {
    position: 'relative',
  },
  inputContainer: {
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  designInput: {
    padding: 20,
    paddingRight: 60, // Make room for the floating button
    fontSize: 16,
    lineHeight: 24,
    minHeight: 120,
    textAlignVertical: 'top',
  },

  // Floating Random Idea Button
  floatingRandomButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // Generate Button - Matching Find Products style
  generateButton: {
    borderRadius: 28,
    shadowColor: '#9B51E0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  gradientGenerateButton: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  generateButtonText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Error
  errorContainer: {
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    borderColor: 'rgba(255, 69, 58, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF453A',
    textAlign: 'center',
  },
});
