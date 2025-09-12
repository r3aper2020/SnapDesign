import React, { useState, useEffect, useRef } from 'react';
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
  Modal,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../theme/ThemeProvider';
import { endpoints } from '../config/api';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { designStorage } from '../services/DesignStorage';

const { width } = Dimensions.get('window');

// ============================================================================
// ICON COMPONENTS
// ============================================================================
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

const LightbulbIcon = ({ size = 24, color = '#666' }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    {/* Bulb */}
    <View style={{
      width: size * 0.5,
      height: size * 0.5,
      backgroundColor: color,
      borderRadius: size * 0.25,
      position: 'absolute',
      top: size * 0.1,
    }} />
    {/* Base */}
    <View style={{
      width: size * 0.3,
      height: size * 0.2,
      backgroundColor: color,
      borderRadius: size * 0.05,
      position: 'absolute',
      bottom: size * 0.1,
    }} />
    {/* Filament */}
    <View style={{
      width: size * 0.4,
      height: 2,
      backgroundColor: color,
      position: 'absolute',
      top: size * 0.3,
      transform: [{ rotate: '45deg' }],
    }} />
    <View style={{
      width: size * 0.4,
      height: 2,
      backgroundColor: color,
      position: 'absolute',
      top: size * 0.3,
      transform: [{ rotate: '-45deg' }],
    }} />
  </View>
);

// ============================================================================
// TYPES & INTERFACES
// ============================================================================
type DesignScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Design'>;

interface DesignScreenProps {
  navigation: DesignScreenNavigationProp;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const DesignScreen: React.FC<DesignScreenProps> = ({ navigation }) => {
  // ============================================================================
  // STATE & HOOKS
  // ============================================================================
  const { theme } = useTheme();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [description, setDescription] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInspirationModalVisible, setIsInspirationModalVisible] = useState(false);
  
  // Animation for the generate button
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Start pulsing animation when button is ready to be pressed
  useEffect(() => {
    if (selectedImage && description.trim() && !isGenerating) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [selectedImage, description, isGenerating, pulseAnim]);

  // ============================================================================
  // DATA & CONSTANTS
  // ============================================================================
  // Organized inspiration categories
  const inspirationCategories = {
    'Holiday & Seasonal': [
      'Decorate this space for Christmas with lights and ornaments',
      'Add Halloween decorations and spooky elements',
      'Create a cozy Thanksgiving atmosphere with fall colors',
      'Add Easter decorations and spring elements',
      'Create a Valentine\'s Day romantic setting',
      'Design a New Year\'s Eve party space'
    ],
    'Simple Additions': [
      'Add a plant in the corner with a nice pot',
      'Place a reading chair by the window',
      'Add some artwork on the walls',
      'Put a small table and lamp in the corner',
      'Add a cozy throw blanket and pillows',
      'Place a mirror to reflect light'
    ],
    'Room Transformations': [
      'Transform into a cozy home office with plants and good lighting',
      'Create a Japanese zen garden with koi pond and bamboo',
      'Design a modern kitchen with island and pendant lights',
      'Make this a children\'s playroom with storage and bright colors',
      'Convert into a home theater with comfortable seating',
      'Create a meditation room with soft lighting'
    ],
    'Outdoor & Patio': [
      'Create a Mediterranean patio with terracotta pots and string lights',
      'Add outdoor seating and string lights for evening ambiance',
      'Design a vegetable garden with raised beds and trellises',
      'Create a cozy outdoor dining area with plants',
      'Build a fire pit area with comfortable seating',
      'Design a tropical oasis with palm plants'
    ],
    'Style & Aesthetic': [
      'Design a Scandinavian living room with light wood and plants',
      'Make this a bohemian bedroom with macrame and plants',
      'Create an industrial loft with exposed brick and metal accents',
      'Design a minimalist space with clean lines and neutral colors',
      'Create a vintage-inspired space with antique furniture',
      'Design a modern farmhouse with rustic elements'
    ],
    'Functional Spaces': [
      'Transform into a home gym with mirrors and equipment',
      'Create a craft room with storage and work surfaces',
      'Design a wine cellar with racks and tasting area',
      'Make this a home library with bookshelves and reading nook',
      'Create a home bar with seating and lighting',
      'Design a laundry room with organization systems'
    ]
  };

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  const openInspirationModal = () => {
    setIsInspirationModalVisible(true);
  };

  const closeInspirationModal = () => {
    setIsInspirationModalVisible(false);
  };

  const selectInspiration = (prompt: string) => {
    setDescription(prompt);
    closeInspirationModal();
  };

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
      
      // Try to get base64 data, fallback to URI if base64 is not available
      if (asset.base64) {
        setSelectedImage(asset.base64);
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
          };
          reader.readAsDataURL(blob);
        } catch (error) {
          console.error('Error converting URI to base64:', error);
          Alert.alert('Error', 'Failed to process the selected image. Please try again.');
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
      
      // Try to get base64 data, fallback to URI if base64 is not available
      if (asset.base64) {
        setSelectedImage(asset.base64);
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
          };
          reader.readAsDataURL(blob);
        } catch (error) {
          console.error('Error converting camera URI to base64:', error);
          Alert.alert('Error', 'Failed to process the captured photo. Please try again.');
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
        throw new Error('Cannot connect to the design server. Please check your internet connection and try again.');
      }
      
      if (!selectedImage || selectedImage.length < 1000) {
        throw new Error('Please select a valid image before generating your design');
      }

      const requestBody = {
        imageBase64: selectedImage,
        description: description.trim(),
        mimeType: 'image/jpeg'
      };
      
      
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
        } catch (saveError) {
          console.error('Error saving design:', saveError);
          // Continue to result screen even if saving fails
        }

        navigation.navigate('Result', {
          generatedImage: data.editedImageBase64,
          originalImage: selectedImage,
          products: data.products.items || data.products
        });
      } else {
        throw new Error('The design server returned an unexpected response. Please try again.');
      }

    } catch (err: any) {
      setError(err.message || 'Failed to generate design');
    } finally {
      setIsGenerating(false);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      {/* Background Image */}
      <Image 
        source={require('../../assets/background.png')} 
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      {/* Fixed Header */}
      <View style={[styles.fixedHeader, { backgroundColor: 'transparent' }]}>
        <View style={styles.headerContent}>
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
          scrollEventThrottle={16}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10
          }}
        >

        {/* Hero Image Section - Using ResultScreen's working approach */}
        <View style={[styles.card, { backgroundColor: 'rgba(0, 0, 0, 0.3)' }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>
              Your Space
            </Text>
            <Text style={[styles.cardSubtitle, { color: theme.colors.text.secondary }]}>
              {selectedImage ? 'Your space is ready for AI transformation' : 'Upload your space to get started'}
            </Text>            
          </View>
          
          {selectedImage ? (
            <View>
              <View style={styles.imageContainer}>
                <Image 
                  source={{ uri: `data:image/jpeg;base64,${selectedImage}` }} 
                  style={styles.generatedImage} 
                  fadeDuration={0}
                />
              </View>
              
              {/* Image Action Buttons - Below the image */}
              <View style={styles.imageActionButtons}>
                <TouchableOpacity
                  style={[styles.imageActionButton, { backgroundColor: theme.colors.secondary.main }]}
                  onPress={pickImage}
                >
                  <Text style={[styles.imageActionButtonText, { color: theme.colors.secondary.contrast }]}>
                    Change Photo
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.imageActionButtonSecondary, { borderColor: theme.colors.accent.purple }]}
                  onPress={takePhoto}
                >
                  <Text style={[styles.imageActionButtonText, { color: theme.colors.accent.purple }]}>
                    Retake Photo
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={[styles.uploadArea, { borderColor: theme.colors.gradient.primary[1] }]}>
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
        <View style={[styles.card, { backgroundColor: 'rgba(0, 0, 0, 0.3)' }]}>
          <View style={styles.inputHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              What do you want to create?
            </Text>
            <TouchableOpacity
              style={[styles.inspirationButton, { 
                backgroundColor: theme.colors.accent.purple,
                shadowColor: theme.colors.accent.purple,
              }]}
              onPress={openInspirationModal}
            >
              <LightbulbIcon size={16} color="#FFFFFF" />
              <Text style={[styles.inspirationButtonText, { color: "#FFFFFF" }]}>
                Inspiration
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={[styles.inputContainer, { 
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderColor: 'rgba(255, 255, 255, 0.2)' 
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
        </View>

        {/* Generate Button - Only show when ready */}
        {(selectedImage && description.trim()) && (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={styles.generateButton}
              onPress={handleGenerateDesign}
              disabled={isGenerating}
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
                      Generating your design...
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
          </Animated.View>
        )}

        {/* Error Display */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Inspiration Modal */}
      <Modal
        visible={isInspirationModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeInspirationModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.colors.background.secondary }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
                Design Inspiration
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={closeInspirationModal}
              >
                <Text style={[styles.modalCloseText, { color: theme.colors.text.primary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Categories */}
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {Object.entries(inspirationCategories).map(([category, prompts]) => (
                <View key={category} style={styles.categorySection}>
                  <Text style={[styles.categoryTitle, { color: theme.colors.text.primary }]}>
                    {category}
                  </Text>
                  {prompts.map((prompt, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.promptItem, { 
                        backgroundColor: theme.colors.background.primary,
                        borderColor: theme.colors.border.light 
                      }]}
                      onPress={() => selectInspiration(prompt)}
                    >
                      <Text style={[styles.promptText, { color: theme.colors.text.primary }]}>
                        {prompt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ============================================================================
// STYLES
// ============================================================================
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
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
    minHeight: '100%',
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
  headerContent: {
    alignItems: 'center',
    paddingTop: 20,
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

  // Card Layout
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.7,
  },
  
  // Image Display
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    position: 'relative',
    width: width - 88,
    height: 280,
    overflow: 'hidden',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
    alignSelf: 'center',
  },
  generatedImage: {
    width: width - 88,
    height: 280,
    borderRadius: 20,
    resizeMode: 'cover',
  },
  
  // Image Action Buttons
  imageActionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 3,
  },
  imageActionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageActionButtonSecondary: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  imageActionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Upload Area
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
    gap: 8,
    width: '100%',
    alignSelf: 'center',
  },
  uploadButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 40,
  },
  uploadButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    flex: 1,
  },
  inputContainer: {
    borderRadius: 24,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  designInput: {
    padding: 20,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 120,
    textAlignVertical: 'top',
  },

  // Inspiration Button
  inspirationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    gap: 4,
  },
  inspirationButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Generate Button - Matching Find Products style
  generateButton: {
    borderRadius: 28,
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

  // Inspiration Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 20,
    fontWeight: '600',
  },
  modalContent: {
    maxHeight: 400,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 8,
  },
  promptItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  promptText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
