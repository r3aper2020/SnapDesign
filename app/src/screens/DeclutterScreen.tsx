import React, { useState, useRef, useCallback } from 'react';
import type { JSX } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
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
import { apiService } from '../services';
import { DecorateResponse } from '../types/api';
import {
  ErrorDisplay,
  TokenBanner,
  AuthModal,
} from '../components';
import { useDesignForm } from '../hooks/useDesignForm';
import { useAuth } from '../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

// ============================================================================
// TYPES & INTERFACES
// ============================================================================
type DeclutterScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Declutter'>;

interface DeclutterScreenProps {
  navigation: DeclutterScreenNavigationProp;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const DeclutterScreen = ({ navigation }: DeclutterScreenProps) => {
  // ============================================================================
  // STATE & HOOKS
  // ============================================================================
  const { theme } = useTheme();
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  const [isAuthModalVisible, setIsAuthModalVisible] = useState(false);
  const [tokensRemaining, setTokensRemaining] = useState<number | null>(null);
  const [userSubscribed, setUserSubscribed] = useState<boolean | null>(null);

  // Local state for image (more reliable than hook state)
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [localImageRenderKey, setLocalImageRenderKey] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

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
  const openImageModal = useCallback(function openImageModal(): void {
    setIsImageModalVisible(true);
  }, []);

  const closeImageModal = useCallback(function closeImageModal(): void {
    setIsImageModalVisible(false);
  }, []);

  const pickImage = useCallback(async function pickImage(): Promise<void> {
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

  const takePhoto = useCallback(async function takePhoto(): Promise<void> {
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

  const handleGenerateDeclutterPlan = useCallback(async function handleGenerateDeclutterPlan(): Promise<void> {
    // Require auth right before calling the API
    if (!isAuthenticated) {
      setIsAuthModalVisible(true);
      return;
    }
    // Validate that we have an image
    if (!formState.selectedImageUri && !localImageUri) {
      formState.setError('Please select an image first');
      return;
    }

    formState.setError(null);
    setIsGenerating(true); // Set local state immediately

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

    // Set form state generating after a short delay to allow animation to start
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
        throw new Error('Cannot connect to the decluttering server. Please check your internet connection and try again.');
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
        throw new Error('Please select a valid image before generating your decluttering plan');
      }

      const requestBody = {
        imageBase64: imageBase64,
        mimeType: 'image/jpeg',
        serviceType: 'declutter' // Add service type to distinguish from design
      };


      const data = await apiService.post<DecorateResponse>(endpoints.decorate(), requestBody);

      // Update token info from response headers
      const tokensRemaining = data.tokenUsage?.tokenRequestCount;
      const userSubscribed = data.tokenUsage?.subscribed;

      if (typeof tokensRemaining === 'number') {
        setTokensRemaining(tokensRemaining);
      }
      if (typeof userSubscribed === 'boolean') {
        setUserSubscribed(userSubscribed);
      }

      if (!data.editedImageBase64 || !data.cleaningSteps) {
        throw new Error('The decluttering server returned an unexpected response. Please try again.');
      }

      // Fast-track progress bar to completion
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false,
      }).start();

      // Small delay to let progress bar complete before navigation
      await new Promise(resolve => setTimeout(resolve, 600));

      try {
        await designStorage.saveDesign({
          description: "Clean and organize this cluttered space",
          originalImage: imageBase64,
          generatedImage: data.editedImageBase64,
          serviceType: 'declutter',
          cleaningSteps: data.cleaningSteps,
          tokenUsage: data.tokenUsage ? {
            imageGeneration: {
              inputTokens: 0,
              outputTokens: 0,
              totalTokens: 0
            },
            textAnalysis: {
              inputTokens: 0,
              outputTokens: 0,
              totalTokens: 0
            },
            grandTotal: 0,
            inputTokensTotal: 0,
            outputTokensTotal: 0
          } : undefined
        });
      } catch (saveError) {
        console.error('Error saving declutter plan:', saveError);
      }

      navigation.navigate('Result', {
        generatedImage: data.editedImageBase64,
        originalImage: imageBase64,
        cleaningSteps: data.cleaningSteps,
        description: "Clean and organize this cluttered space",
        serviceType: 'declutter'
      });
    } catch (err: any) {
      formState.setError(err.message || 'Failed to generate decluttering plan');

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
      setIsGenerating(false); // Reset local state
      formState.setIsGenerating(false);
    }
  }, [formState, navigation, localImageUri, fadeAnim, loadingFadeAnim, progressAnim, pulseAnim, theme, isAuthenticated]);

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
              AI Decluttering Analysis
            </Text>
            <Text style={[styles.loadingSubtitle, { color: theme.colors.text.secondary }]}>
              Analyzing your space for cleaning opportunities...
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
              <View style={[styles.stepIcon, { backgroundColor: theme.colors.button.primary }]}>
                <MaterialIcons name="radio-button-checked" size={16} color="#FFFFFF" />
              </View>
              <Text style={[styles.stepText, { color: theme.colors.text.secondary }]}>
                Analyzing clutter and organization opportunities
              </Text>
            </View>

            <View style={styles.processingStep}>
              <View style={[styles.stepIcon, { backgroundColor: theme.colors.button.primary }]}>
                <MaterialIcons name="radio-button-checked" size={16} color="#FFFFFF" />
              </View>
              <Text style={[styles.stepText, { color: theme.colors.text.secondary }]}>
                Creating step-by-step cleaning plan
              </Text>
            </View>

            <View style={styles.processingStep}>
              <View style={[styles.stepIcon, { backgroundColor: theme.colors.button.primary }]}>
                <MaterialIcons name="radio-button-checked" size={16} color="#FFFFFF" />
              </View>
              <Text style={[styles.stepText, { color: theme.colors.text.secondary }]}>
                Generating organized space visualization
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
              Please wait while we create your decluttering plan...
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
          Capture the space you want to clean and organize
        </Text>
      </View>

      {/* Upload buttons when no image selected */}
      {!(localImageUri || formState.selectedImageUri) && !formState.isProcessingImage && (
        <View style={styles.uploadButtons}>
          <TouchableOpacity
            style={[styles.uploadButton, { backgroundColor: theme.colors.button.primary }]}
            onPress={pickImage}
            accessibilityLabel="Choose photo from gallery"
            accessibilityRole="button"
          >
            <Text style={[styles.uploadButtonText, { color: theme.colors.primary.contrast }]}>
              Choose Photo
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.uploadButton, styles.uploadButtonSecondary, { borderColor: theme.colors.button.secondary }]}
            onPress={takePhoto}
            accessibilityLabel="Take a new photo"
            accessibilityRole="button"
          >
            <Text style={[styles.uploadButtonText, { color: theme.colors.button.secondary }]}>
              Take Photo
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Processing state */}
      {formState.isProcessingImage && (
        <View style={styles.processingContainer}>
          <ActivityIndicator color={theme.colors.button.primary} size="large" />
          <Text style={[styles.processingText, { color: theme.colors.text.secondary }]}>
            Processing your image...
          </Text>
        </View>
      )}
    </View>
  );

  const renderThumbnailSection = () => (
    <View style={styles.thumbnailSection}>
      {/* Header section with title */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          Your Space
        </Text>
        <Text style={[styles.sectionSubtitle, { color: theme.colors.text.secondary }]}>
          Tap the image to view full size
        </Text>
      </View>

      {/* Image container */}
      <View style={styles.imageContainer}>
        <TouchableOpacity
          style={[styles.thumbnailWrapper, { borderColor: theme.colors.button.primary }]}
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
    </View>
  );

  const renderGenerateSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          Generate Your Plan
        </Text>
        <Text style={[styles.sectionSubtitle, { color: theme.colors.text.secondary }]}>
          Get a step-by-step cleaning and organization plan
        </Text>
      </View>

      {/* Generate button */}
      <TouchableOpacity
        style={styles.generateButton}
        onPress={handleGenerateDeclutterPlan}
        disabled={isGenerating}
        accessibilityLabel="Generate decluttering plan"
        accessibilityRole="button"
        accessibilityHint="Generate your cleaning and organization plan based on the selected image and description"
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
                Generating your plan...
              </Text>
            </View>
          ) : (
            <View style={styles.generateButtonContent}>
              <MaterialIcons name="cleaning-services" size={24} color={theme.colors.text.primary} />
              <Text style={[styles.generateButtonText, { color: theme.colors.text.primary }]}>
                Generate Plan
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
              onPress={() => { }} // Prevent closing when tapping image
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
            {/* Token Banner */}
            <TokenBanner
              tokensRemaining={tokensRemaining}
              userSubscribed={userSubscribed}
            />

            {/* Page Header */}
            <View style={styles.pageHeader}>
              <Text style={[styles.pageTitle, { color: theme.colors.text.primary }]}>
                Clean & Organize
              </Text>
              <Text style={[styles.pageSubtitle, { color: theme.colors.text.secondary }]}>
                Get a step-by-step plan to declutter your space
              </Text>
            </View>

            {/* Main Content Sections */}
            <View style={styles.contentContainer}>
              {/* Show photo capture section first */}
              {!(localImageUri || formState.selectedImageUri) && !formState.isProcessingImage && renderPhotoCaptureSection()}

              {/* Show processing state */}
              {formState.isProcessingImage && renderPhotoCaptureSection()}

              {/* Show thumbnail section once photo is selected */}
              {(localImageUri || formState.selectedImageUri) && !formState.isProcessingImage && (
                <>
                  {renderThumbnailSection()}
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
        {isGenerating && renderLoadingScreen()}
      </KeyboardAvoidingView>

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
      {!isGenerating && (
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
// STYLES (Reusing most styles from DesignScreen with minor adjustments)
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

  // Thumbnail Section
  thumbnailSection: {
    marginBottom: 30,
  },
  imageContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  thumbnailWrapper: {
    width: Math.min(300, width * 0.8),
    height: Math.min(200, width * 0.6),
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
  cleaningIcon: {
    fontSize: 20,
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
