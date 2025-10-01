import React, { useState, useRef, useCallback, useEffect } from 'react';
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
  StatusBar,
  Modal,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../theme/ThemeProvider';
import { endpoints } from '../config/api';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { designStorage } from '../services/DesignStorage';
import {
  ImagePreview,
  InspirationModal,
  ErrorDisplay,
  SparkleIcon,
  AuthModal,
} from '../components';
import { useDesignForm } from '../hooks/useDesignForm';
import { useAuth } from '../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

// ============================================================================
// TYPES & INTERFACES
// ============================================================================
type MakeoverScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Makeover'>;

interface MakeoverScreenProps {
  navigation: MakeoverScreenNavigationProp;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const MakeoverScreen: React.FC<MakeoverScreenProps> = ({ navigation }) => {
  console.log('MakeoverScreen loaded');
  
  useEffect(() => {
    console.log('MakeoverScreen mounted');
    return () => {
      console.log('MakeoverScreen unmounted');
    };
  }, []);
  
  // ============================================================================
  // STATE & HOOKS
  // ============================================================================
  const { theme } = useTheme();
  const [isInspirationModalVisible, setIsInspirationModalVisible] = useState(false);
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  const [isAuthModalVisible, setIsAuthModalVisible] = useState(false);
  
  // Local state for image (more reliable than hook state)
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [localImageRenderKey, setLocalImageRenderKey] = useState(0);
  
  // Custom hooks
  const formState = useDesignForm();
  const { isAuthenticated } = useAuth();
  
  // Get screen dimensions
  const { width, height } = Dimensions.get('window');
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const loadingFadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  const openInspirationModal = useCallback(() => {
    setIsInspirationModalVisible(true);
  }, []);

  const closeInspirationModal = useCallback(() => {
    setIsInspirationModalVisible(false);
  }, []);

  const selectInspiration = useCallback((prompt: string) => {
    formState.setDescription(prompt);
    closeInspirationModal();
  }, [formState, closeInspirationModal]);

  const openImageModal = useCallback(() => {
    setIsImageModalVisible(true);
  }, []);

  const closeImageModal = useCallback(() => {
    setIsImageModalVisible(false);
  }, []);

  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.7,
      base64: true,
      exif: false,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      
      // Set local state immediately for display
      if (asset.uri) {
        setLocalImageUri(asset.uri);
        setLocalImageRenderKey(prev => prev + 1);
      }
      
      formState.setIsProcessingImage(true);
      
      try {
        await formState.handleImageData(asset);
      } catch (error) {
        formState.setError('Failed to process the selected image. Please try again.');
      }
    }
  }, [formState]);

  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access your camera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.7,
      base64: true,
      exif: false,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      
      // Set local state immediately for display
      if (asset.uri) {
        setLocalImageUri(asset.uri);
        setLocalImageRenderKey(prev => prev + 1);
      }
      
      formState.setIsProcessingImage(true);
      
      try {
        await formState.handleImageData(asset);
      } catch (error) {
        formState.setError('Failed to process the captured photo. Please try again.');
      }
    }
  }, [formState]);

  const handleGenerateMakeover = useCallback(async () => {
    // Require auth right before calling the API
    if (!isAuthenticated) {
      setIsAuthModalVisible(true);
      return;
    }
    // Validate that we have both image and description
    if (!formState.selectedImageUri && !localImageUri) {
      formState.setError('Please select an image first');
      return;
    }
    
    if (!formState.description.trim()) {
      formState.setError('Please describe your makeover vision');
      return;
    }

    formState.setError(null);

    // Start fade animation immediately
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(loadingFadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Start pulsing animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    // Start progress animation
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 30000, // 30 seconds for full progress
      useNativeDriver: false,
    }).start();

    // Set generating state after a short delay to allow animation to start
    setTimeout(() => {
      formState.setIsGenerating(true);
    }, 100);

    try {
      // Health check
      try {
        const healthResponse = await fetch(endpoints.health());
        if (!healthResponse.ok) {
          throw new Error('Server not responding');
        }
      } catch (healthError) {
        throw new Error('Cannot connect to the makeover server. Please check your internet connection and try again.');
      }
      
      // Ensure we have base64 data for the image
      let imageBase64 = formState.selectedImage;
      
      if (!imageBase64 && (formState.selectedImageUri || localImageUri)) {
        // Convert URI to base64 if we don't have it yet
        try {
          const imageUri = formState.selectedImageUri || localImageUri!;
          const response = await fetch(imageUri);
          const blob = await response.blob();
          const reader = new FileReader();
          
          imageBase64 = await new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              try {
                const base64 = reader.result as string;
                const cleanBase64 = base64.split(',')[1];
                resolve(cleanBase64);
              } catch (error) {
                reject(error);
              }
            };
            reader.onerror = () => reject(new Error('FileReader error'));
            reader.readAsDataURL(blob);
          });
          
          // Update the form state with the base64 data
          formState.setSelectedImage(imageBase64);
        } catch (error) {
          throw new Error('Failed to process the selected image. Please try again.');
        }
      }
      
      if (!imageBase64 || imageBase64.length < 1000) {
        throw new Error('Please select a valid image before generating your makeover');
      }

      const requestBody = {
        imageBase64: imageBase64,
        description: formState.description.trim(),
        mimeType: 'image/jpeg',
        serviceType: 'makeover'
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
        // Fast-track progress bar to completion
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: false,
        }).start();

        // Small delay to let progress bar complete before navigation
        await new Promise(resolve => setTimeout(resolve, 600));

        let savedDesignId = '';
        try {
          const savedDesign = await designStorage.saveDesign({
            description: formState.description.trim(),
            originalImage: imageBase64,
            generatedImage: data.editedImageBase64,
            serviceType: 'makeover',
            products: data.products.items || data.products,
            tokenUsage: data.tokenUsage
          });
          savedDesignId = savedDesign.id;
        } catch (saveError) {
          console.error('Error saving makeover:', saveError);
        }

      navigation.navigate('Result', {
        generatedImage: data.editedImageBase64,
        originalImage: imageBase64,
        products: data.products.items || data.products,
        designId: savedDesignId,
        description: formState.description.trim(),
        serviceType: 'makeover'
      });
      } else {
        throw new Error('The makeover server returned an unexpected response. Please try again.');
      }

    } catch (err: any) {
      formState.setError(err.message || 'Failed to generate makeover');
      
      // Reset animation on error
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(loadingFadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } finally {
      formState.setIsGenerating(false);
    }
  }, [formState, navigation, localImageUri, fadeAnim, loadingFadeAnim, isAuthenticated]);

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================
  const renderLoadingScreen = () => {
    const currentImageUri = localImageUri || formState.selectedImageUri;
    
    return (
      <Animated.View 
        style={[
          styles.loadingScreen,
          {
            opacity: loadingFadeAnim,
          }
        ]}
      >
        <View style={styles.loadingMainContainer}>
          {/* Header */}
          <View style={styles.loadingHeader}>
            <Text style={[styles.loadingTitle, { color: theme.colors.text.primary }]}>
              AI Makeover Generation
            </Text>
            <Text style={[styles.loadingSubtitle, { color: theme.colors.text.secondary }]}>
              Transforming your space...
            </Text>
          </View>

          {/* Image Preview */}
          {currentImageUri && (
            <View style={styles.imagePreviewContainer}>
              <Animated.View 
                style={[
                  styles.imagePreview,
                  {
                    transform: [{ scale: pulseAnim }]
                  }
                ]}
              >
                <LinearGradient
                  colors={theme.colors.gradient.primary}
                  style={styles.gradientBorder}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Image 
                    source={{ uri: currentImageUri }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                </LinearGradient>
                <View style={styles.imageOverlay}>
                  <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]} />
                  <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]} />
                </View>
              </Animated.View>
            </View>
          )}

          {/* Processing Steps */}
          <View style={styles.processingSteps}>
            <View style={styles.processingStep}>
              <View style={[styles.stepIcon, { backgroundColor: theme.colors.primary.main }]}>
                <MaterialIcons name="radio-button-checked" size={16} color="#FFFFFF" />
              </View>
              <Text style={[styles.stepText, { color: theme.colors.text.secondary }]}>
                Analyzing your space
              </Text>
            </View>
            
            <View style={styles.processingStep}>
              <View style={[styles.stepIcon, { backgroundColor: theme.colors.primary.main }]}>
                <MaterialIcons name="radio-button-checked" size={16} color="#FFFFFF" />
              </View>
              <Text style={[styles.stepText, { color: theme.colors.text.secondary }]}>
                Searching for products for your space
              </Text>
            </View>
            
            <View style={styles.processingStep}>
              <View style={[styles.stepIcon, { backgroundColor: theme.colors.primary.main }]}>
                <MaterialIcons name="radio-button-checked" size={16} color="#FFFFFF" />
              </View>
              <Text style={[styles.stepText, { color: theme.colors.text.secondary }]}>
                Generating your makeover based on similar products found
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                <Animated.View 
                  style={[
                    styles.progressFill,
                    { 
                      backgroundColor: theme.colors.primary.main,
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      })
                    }
                  ]} 
                />
              </View>
            </View>
            <Text style={[styles.progressText, { color: theme.colors.text.secondary }]}>
              Please wait while we create your makeover...
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  };
  const renderPhotoCaptureSection = () => (
    <View style={styles.photoCaptureSection}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          Take a Photo
        </Text>
        <Text style={[styles.sectionSubtitle, { color: theme.colors.text.secondary }]}>
          Capture your space to get started
        </Text>
      </View>
      
      {/* Upload buttons when no image selected */}
      {!(localImageUri || formState.selectedImageUri) && !formState.isProcessingImage && (
        <View style={styles.uploadButtons}>
          <TouchableOpacity 
            style={[styles.uploadButton, { backgroundColor: theme.colors.primary.main }]}
            onPress={pickImage}
            accessibilityLabel="Choose photo from gallery"
            accessibilityRole="button"
          >
            <Text style={[styles.uploadButtonText, { color: theme.colors.primary.contrast }]}>
              Choose Photo
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.uploadButton, styles.uploadButtonSecondary, { borderColor: theme.colors.primary.main }]}
            onPress={takePhoto}
            accessibilityLabel="Take a new photo"
            accessibilityRole="button"
          >
            <Text style={[styles.uploadButtonText, { color: theme.colors.primary.main }]}>
              Take Photo
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Processing state */}
      {formState.isProcessingImage && (
        <View style={styles.processingContainer}>
          <ActivityIndicator color={theme.colors.primary.main} size="large" />
          <Text style={[styles.processingText, { color: theme.colors.text.secondary }]}>
            Processing your image...
          </Text>
        </View>
      )}
    </View>
  );

  const renderThumbnailAndPromptSection = () => (
    <View style={styles.thumbnailPromptSection}>
      {/* Header section with title and Get Ideas button */}
      <View style={styles.promptHeader}>
        <Text style={[styles.promptTitle, { color: theme.colors.text.primary }]}>
          Describe Your Vision
        </Text>
        <TouchableOpacity
          style={[styles.inspirationButton, { backgroundColor: theme.colors.accent.purple }]}
          onPress={openInspirationModal}
          accessibilityLabel="Get makeover inspiration ideas"
          accessibilityRole="button"
        >
          <Text style={[styles.inspirationButtonText, { color: "#FFFFFF" }]}>
            Get Ideas
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Side-by-side container */}
      <View style={styles.thumbnailPromptContainer}>
        {/* Thumbnail on the left */}
        <View style={styles.thumbnailContainer}>
          <TouchableOpacity 
            style={[styles.thumbnailWrapper, { borderColor: theme.colors.primary.main }]}
            onPress={openImageModal}
            activeOpacity={0.8}
            accessibilityLabel="View full size image"
            accessibilityRole="button"
          >
            <Image 
              source={{ uri: (localImageUri || formState.selectedImageUri)! }} 
              style={styles.thumbnailImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        </View>

        {/* Prompt area on the right */}
        <View style={styles.promptContainer}>
          <View style={[styles.inputContainer, { 
            backgroundColor: theme.colors.background.secondary,
            borderColor: theme.colors.border.light 
          }]}>
            <TextInput
              style={[styles.designInput, { color: theme.colors.text.primary }]}
              value={formState.description}
              onChangeText={formState.setDescription}
              placeholder="Describe your makeover vision... e.g., 'Transform this into a modern home office with plants and natural lighting'"
              placeholderTextColor={theme.colors.text.secondary}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={500}
              accessibilityLabel="Makeover description input"
              accessibilityHint="Enter a description of what you want to create in this space"
            />
          </View>
          <View style={styles.characterCount}>
            <Text style={[styles.characterCountText, { color: theme.colors.text.secondary }]}>
              {formState.description.length}/500
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderGenerateSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          Generate Your Makeover
        </Text>
        <Text style={[styles.sectionSubtitle, { color: theme.colors.text.secondary }]}>
          Review and create your AI transformation
        </Text>
      </View>
      
      {/* Generate button */}
      <TouchableOpacity
        style={styles.generateButton}
        onPress={handleGenerateMakeover}
        disabled={formState.isGenerating}
        accessibilityLabel="Generate AI makeover"
        accessibilityRole="button"
        accessibilityHint="Generate your makeover based on the selected image and description"
      >
        <LinearGradient
          colors={theme.colors.gradient.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientGenerateButton}
        >
          {formState.isGenerating ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={theme.colors.text.primary} size="small" />
              <Text style={[styles.loadingText, { color: theme.colors.text.primary }]}>
                Generating your makeover...
              </Text>
            </View>
          ) : (
            <View style={styles.generateButtonContent}>
              <SparkleIcon size={20} color={theme.colors.text.primary} />
              <Text style={[styles.generateButtonText, { color: theme.colors.text.primary }]}>
                Generate Makeover
              </Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderImageModal = () => (
    <Modal
      visible={isImageModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={closeImageModal}
    >
      <View style={styles.imageModalOverlay}>
        <TouchableOpacity 
          style={styles.imageModalBackground}
          activeOpacity={1}
          onPress={closeImageModal}
        >
          <View style={styles.imageModalContent}>
            {/* Close button */}
            <TouchableOpacity 
              style={[styles.imageModalCloseButton, { backgroundColor: theme.colors.background.secondary }]}
              onPress={closeImageModal}
              accessibilityLabel="Close image modal"
              accessibilityRole="button"
            >
              <MaterialIcons 
                name="close" 
                size={20} 
                color={theme.colors.text.primary}
              />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.imageModalImageContainer}
              activeOpacity={1}
              onPress={() => {}} // Prevent closing when tapping image
            >
              <Image 
                source={{ uri: (localImageUri || formState.selectedImageUri)! }} 
                style={styles.imageModalImage}
                resizeMode="contain"
              />
            </TouchableOpacity>
            
            {/* Action buttons */}
            <View style={styles.imageModalActions}>
              <TouchableOpacity 
                style={[styles.imageModalButton, { backgroundColor: theme.colors.background.secondary }]}
                onPress={() => {
                  closeImageModal();
                  pickImage();
                }}
                accessibilityLabel="Change photo"
                accessibilityRole="button"
              >
                <Text style={[styles.imageModalButtonText, { color: theme.colors.text.primary }]}>
                  Change Photo
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.imageModalButton, styles.imageModalButtonSecondary, { borderColor: theme.colors.primary.main }]}
                onPress={() => {
                  closeImageModal();
                  takePhoto();
                }}
                accessibilityLabel="Retake photo"
                accessibilityRole="button"
              >
                <Text style={[styles.imageModalButtonText, { color: theme.colors.primary.main }]}>
                  Retake Photo
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </Modal>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background.primary} />
      
      {/* Background Image */}
      <Image 
        source={require('../../assets/background.png')} 
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      
      
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        enabled={true}
      >
        <Animated.View 
          style={[
            { flex: 1 },
            { opacity: fadeAnim }
          ]}
        >
          <ScrollView 
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={true}
            alwaysBounceVertical={false}
            overScrollMode="auto"
          >
          {/* Page Header */}
          <View style={styles.pageHeader}>
            <Text style={[styles.pageTitle, { color: theme.colors.text.primary }]}>
              Create Your Makeover
            </Text>
            <Text style={[styles.pageSubtitle, { color: theme.colors.text.secondary }]}>
              Transform any space with AI-powered makeover
            </Text>
          </View>

          {/* Main Content Sections */}
          <View style={styles.contentContainer}>
            {/* Show photo capture section first */}
            {!(localImageUri || formState.selectedImageUri) && !formState.isProcessingImage && renderPhotoCaptureSection()}
            
            {/* Show processing state */}
            {formState.isProcessingImage && renderPhotoCaptureSection()}
            
            {/* Show thumbnail + prompt section once photo is selected */}
            {(localImageUri || formState.selectedImageUri) && !formState.isProcessingImage && (
              <>
                {renderThumbnailAndPromptSection()}
                {renderGenerateSection()}
              </>
            )}
          </View>

          {/* Error Display */}
          <ErrorDisplay
            error={formState.error}
            onDismiss={() => formState.setError(null)}
            theme={theme}
          />
          </ScrollView>
        </Animated.View>
        
        {/* Loading Screen */}
        {formState.isGenerating && renderLoadingScreen()}
      </KeyboardAvoidingView>

      {/* Inspiration Modal */}
      <InspirationModal
        visible={isInspirationModalVisible}
        onClose={closeInspirationModal}
        onSelectInspiration={selectInspiration}
        theme={theme}
      />

      {/* Image Modal */}
      {renderImageModal()}

      {/* Auth Modal */}
      <AuthModal
        visible={isAuthModalVisible}
        onClose={() => setIsAuthModalVisible(false)}
        onSignIn={() => {
          setIsAuthModalVisible(false);
          navigation.navigate('Login');
        }}
        onSignUp={() => {
          setIsAuthModalVisible(false);
          navigation.navigate('Signup');
        }}
      />

      {/* Bottom Navigation - Hide during generation */}
      {!formState.isGenerating && (
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={[styles.bottomNavButton, { backgroundColor: theme.colors.background.secondary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.bottomNavButtonText, { color: theme.colors.text.primary }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
  scrollContent: {
    flexGrow: 1,
    paddingTop: 20,
    paddingBottom: 40,
  },
  
  // Page Header
  pageHeader: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.8,
    maxWidth: width - 80,
  },
  
  // Content Container
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  
  // Sections
  section: {
    marginBottom: 40,
  },
  sectionHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.8,
    maxWidth: width - 80,
  },

  // Photo Capture Section
  photoCaptureSection: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: height * 0.4,
  },
  processingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  processingText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },

  // Thumbnail and Prompt Section
  thumbnailPromptSection: {
    marginBottom: 30,
  },
  promptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  promptTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
  },
  thumbnailPromptContainer: {
    flexDirection: width < 400 ? 'column' : 'row', // Stack on very small screens
    gap: width < 350 ? 8 : width < 400 ? 12 : 16, // Smaller gaps on very small screens
    alignItems: width < 400 ? 'center' : 'flex-start',
  },
  thumbnailContainer: {
    alignItems: 'center',
    width: width < 400 ? '100%' : Math.min(180, width * 0.4), // Full width on small screens
  },
  thumbnailWrapper: {
    width: width < 350 ? Math.min(160, width * 0.5) : width < 400 ? Math.min(200, width * 0.6) : Math.min(160, width * 0.4), // Progressive sizing
    height: width < 350 ? 120 : width < 400 ? 140 : 250, // Progressive height scaling
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderStyle: 'dashed',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  promptContainer: {
    flex: 1,
    width: width < 400 ? '100%' : undefined, // Full width on small screens
  },


  // Upload Buttons
  uploadButtons: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    marginTop: 20,
  },
  uploadButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    minHeight: 56,
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
    justifyContent: 'flex-start',
    marginTop: 10,
  },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  inspirationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inspirationButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputContainer: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    height: width < 350 ? 120 : width < 400 ? 140 : 250, // Progressive height matching
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  designInput: {
    fontSize: 16,
    lineHeight: 22,
    height: width < 350 ? 88 : width < 400 ? 108 : 218, // Progressive height minus padding
    textAlignVertical: 'top',
  },
  characterCount: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  characterCountText: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.7,
  },


  // Generate Button
  generateButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 24,
  },
  gradientGenerateButton: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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

  // Image Modal
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalBackground: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    position: 'relative',
  },
  imageModalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  imageModalCloseButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  imageModalImageContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalImage: {
    width: '100%',
    height: '100%',
    maxWidth: width - 40,
    maxHeight: height - 200,
  },
  imageModalActions: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
    width: '100%',
    justifyContent: 'center',
  },
  imageModalButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    maxWidth: 150,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  imageModalButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  imageModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Loading Screen Styles
  loadingScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingMainContainer: {
    width: '100%',
    maxWidth: 400,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  loadingHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  loadingSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
    fontWeight: '400',
  },
  imagePreviewContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  imagePreview: {
    width: 160,
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  gradientBorder: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    padding: 3,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 13,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  processingSteps: {
    width: '100%',
    marginBottom: 40,
  },
  processingStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  stepIcon: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 16,
  },
  stepIconText: {
    fontSize: 8,
    color: '#FFFFFF',
  },
  stepText: {
    fontSize: 14,
    flex: 1,
    fontWeight: '400',
    opacity: 0.9,
  },
  progressSection: {
    width: '100%',
    alignItems: 'center',
  },
  progressBarContainer: {
    width: '100%',
    marginBottom: 16,
  },
  progressBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '400',
    opacity: 0.7,
    textAlign: 'center',
  },

  // Bottom Navigation
  bottomNav: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'android' ? 24 : 12,
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  bottomNavButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  bottomNavButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
});