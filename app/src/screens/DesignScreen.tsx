import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Animated,
  StatusBar,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../theme/ThemeProvider';
import { endpoints } from '../config/api';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { designStorage } from '../services/DesignStorage';
import {
  StepIndicator,
  ImagePreview,
  InspirationModal,
  SwipeIndicator,
  ErrorDisplay,
  SparkleIcon,
} from '../components';
import { useDesignForm } from '../hooks/useDesignForm';
import { useStepAnimations } from '../hooks/useStepAnimations';

const { width, height } = Dimensions.get('window');

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
  const [currentStep, setCurrentStep] = useState(1);
  const [isInspirationModalVisible, setIsInspirationModalVisible] = useState(false);
  
  // Local state for image (more reliable than hook state)
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [localImageRenderKey, setLocalImageRenderKey] = useState(0);
  
  // Custom hooks
  const formState = useDesignForm();
  const animations = useStepAnimations(currentStep);
  
  // ScrollView ref for auto-scrolling
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Function to scroll to text input when focused
  const scrollToTextInput = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  // Step navigation functions
  const goToNextStep = useCallback(() => {
    if (currentStep < 3 && formState.canProceedToNext(currentStep)) {
      if (formState.validateForm(currentStep)) {
        setCurrentStep(currentStep + 1);
      }
    }
  }, [currentStep, formState]);

  const goToPreviousStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      formState.setError(null);
    }
  }, [currentStep, formState]);

  // Enhanced swipe gesture handler
  const onSwipeGesture = useCallback((event: any) => {
    const { translationX, state, velocityX } = event.nativeEvent;
    
    if (state === State.END) {
      const isSwipeLeft = translationX < -30 || velocityX < -500;
      const isSwipeRight = translationX > 30 || velocityX > 500;
      
      if (isSwipeLeft && currentStep < 3 && formState.canProceedToNext(currentStep)) {
        goToNextStep();
      } else if (isSwipeRight && currentStep > 1) {
        goToPreviousStep();
      }
    }
  }, [currentStep, formState, goToNextStep, goToPreviousStep]);


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

  const handleGenerateDesign = useCallback(async () => {
    if (!formState.validateForm(3)) {
      return;
    }

    formState.setIsGenerating(true);
    formState.setError(null);

    try {
      // Health check
      try {
        const healthResponse = await fetch(endpoints.health());
        if (!healthResponse.ok) {
          throw new Error('Server not responding');
        }
      } catch (healthError) {
        throw new Error('Cannot connect to the design server. Please check your internet connection and try again.');
      }
      
      // Ensure we have base64 data for the image
      let imageBase64 = formState.selectedImage;
      
      if (!imageBase64 && formState.selectedImageUri) {
        // Convert URI to base64 if we don't have it yet
        try {
          const response = await fetch(formState.selectedImageUri);
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
        throw new Error('Please select a valid image before generating your design');
      }

      const requestBody = {
        imageBase64: imageBase64,
        description: formState.description.trim(),
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
        try {
          await designStorage.saveDesign({
            description: formState.description.trim(),
            originalImage: imageBase64,
            generatedImage: data.editedImageBase64,
            products: data.products.items || data.products,
            tokenUsage: data.tokenUsage
          });
        } catch (saveError) {
          console.error('Error saving design:', saveError);
        }

        navigation.navigate('Result', {
          generatedImage: data.editedImageBase64,
          originalImage: imageBase64,
          products: data.products.items || data.products,
          description: formState.description.trim()
        });
      } else {
        throw new Error('The design server returned an unexpected response. Please try again.');
      }

    } catch (err: any) {
      formState.setError(err.message || 'Failed to generate design');
    } finally {
      formState.setIsGenerating(false);
    }
  }, [formState, navigation]);

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================
  const renderStep1 = () => (
      <View style={styles.stepContent}>
        <View style={styles.stepHeader}>
          <Text style={[styles.stepTitle, { color: theme.colors.text.primary }]}>
            Upload Your Space
          </Text>
          <Text style={[styles.stepSubtitle, { color: theme.colors.text.secondary }]}>
            Take a photo or choose from your gallery
          </Text>
        </View>
      
      {/* Direct image display - bypassing ImagePreview component */}
      {localImageUri && (
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <View style={{ 
            width: width - 60, 
            height: width * 0.8, 
            borderRadius: 20, 
            overflow: 'hidden'
          }}>
            <Image 
              source={{ uri: localImageUri }} 
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 20, width: width - 60 }}>
            <TouchableOpacity 
              style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, backgroundColor: theme.colors.background.secondary }}
              onPress={pickImage}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.text.primary, textAlign: 'center' }}>
                Change Photo
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.primary.main }}
              onPress={takePhoto}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.primary.main, textAlign: 'center' }}>
                Retake
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {/* Fallback to ImagePreview if no local image */}
      {!localImageUri && (
        <ImagePreview
          imageUri={formState.selectedImageUri}
          isProcessing={formState.isProcessingImage}
          onRetake={takePhoto}
          onChangePhoto={pickImage}
          theme={theme}
          size="large"
          showActions={!!formState.selectedImageUri}
          renderKey={formState.imageRenderKey}
        />
      )}
      
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
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <Text style={[styles.stepTitle, { color: theme.colors.text.primary }]}>
          Describe Your Vision
        </Text>
        <Text style={[styles.stepSubtitle, { color: theme.colors.text.secondary }]}>
          Tell us what you want to create in this space
        </Text>
      </View>
      
      {formState.selectedImageUri && (
        <View style={styles.step2ImageContainer}>
          <ImagePreview
            imageUri={formState.selectedImageUri}
            isProcessing={false}
            onRetake={takePhoto}
            onChangePhoto={pickImage}
            theme={theme}
            size="large"
            showActions={false}
            renderKey={formState.imageRenderKey}
          />
        </View>
      )}
      
      <View style={styles.inputSection}>
        <View style={styles.inputHeader}>
          <Text style={[styles.inputLabel, { color: theme.colors.text.primary }]}>
            What do you want to create?
          </Text>
          <TouchableOpacity
            style={[styles.inspirationButton, { backgroundColor: theme.colors.accent.purple }]}
            onPress={openInspirationModal}
            accessibilityLabel="Get design inspiration ideas"
            accessibilityRole="button"
          >
            <Text style={[styles.inspirationButtonText, { color: "#FFFFFF" }]}>
              Get Ideas
            </Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.inputContainer, { 
          backgroundColor: theme.colors.background.secondary,
          borderColor: theme.colors.border.light 
        }]}>
          <TextInput
            style={[styles.designInput, { color: theme.colors.text.primary }]}
            value={formState.description}
            onChangeText={formState.setDescription}
            placeholder="Describe your design vision... e.g., 'Transform this into a modern home office with plants and natural lighting'"
            placeholderTextColor={theme.colors.text.secondary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            onFocus={scrollToTextInput}
            maxLength={500}
            accessibilityLabel="Design description input"
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
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <Text style={[styles.stepTitle, { color: theme.colors.text.primary }]}>
          Generate Design
        </Text>
        <Text style={[styles.stepSubtitle, { color: theme.colors.text.secondary }]}>
          Review and generate your AI transformation
        </Text>
      </View>
    
      {/* Large image preview like steps 1 and 2 */}
      {(localImageUri || formState.selectedImageUri) && (
        <View style={styles.step2ImageContainer}>
          <View style={{ 
            width: width - 60, 
            height: width * 0.8, 
            borderRadius: 20, 
            overflow: 'hidden'
          }}>
            <Image 
              source={{ uri: (localImageUri || formState.selectedImageUri)! }} 
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
              accessibilityLabel="Selected room image for design generation"
            />
          </View>
        </View>
      )}
      
      {/* Design summary */}
      <View style={[styles.designSummary, { backgroundColor: theme.colors.background.secondary }]}>
        <Text style={[styles.summaryTitle, { color: theme.colors.text.primary }]}>
          Design Summary
        </Text>
        <Text style={[styles.summaryText, { color: theme.colors.text.secondary }]}>
          {formState.description}
        </Text>
      </View>
      
      {/* Generate button */}
      <TouchableOpacity
        style={styles.generateButton}
        onPress={handleGenerateDesign}
        disabled={formState.isGenerating}
        accessibilityLabel="Generate AI design"
        accessibilityRole="button"
        accessibilityHint="Generate your design based on the selected image and description"
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
    </View>
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        {/* Header */}
        <View style={styles.header}>
          <StepIndicator currentStep={currentStep} totalSteps={3} theme={theme} />
        </View>

        <View style={styles.mainContent}>
          <PanGestureHandler
            onHandlerStateChange={onSwipeGesture}
            activeOffsetX={[-15, 15]}
            failOffsetY={[-20, 20]}
          >
            <View style={styles.stepContainer}>
              {/* Step Content */}
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}

              {/* Error Display */}
              <ErrorDisplay
                error={formState.error}
                onDismiss={() => formState.setError(null)}
                theme={theme}
              />
            </View>
          </PanGestureHandler>

          {/* Navigation Arrows */}
          <SwipeIndicator
            direction="left"
            onPress={goToPreviousStep}
            theme={theme}
            visible={currentStep > 1}
          />
          
          <SwipeIndicator
            direction="right"
            onPress={goToNextStep}
            theme={theme}
            animatedValue={animations.glowAnim}
            visible={currentStep < 3 && formState.canProceedToNext(currentStep)}
          />
        </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Inspiration Modal */}
      <InspirationModal
        visible={isInspirationModalVisible}
        onClose={closeInspirationModal}
        onSelectInspiration={selectInspiration}
        theme={theme}
      />
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
  mainContent: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  
  // Header
  header: {
    paddingTop: 60,
    paddingBottom: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  
  // Step Indicator
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicatorItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepIndicatorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIndicatorText: {
    fontSize: 16,
    fontWeight: '600',
  },
  stepIndicatorLine: {
    width: 40,
    height: 2,
    marginHorizontal: 8,
  },
  
  // Step Content
  stepContent: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 20,
  },
  stepContentTopAligned: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  stepContentCentered: {
    flex: 1,
    justifyContent: 'center',
  },
  stepScrollView: {
    flex: 1,
  },
  stepScrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
    minHeight: '100%',
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 36,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.8,
    maxWidth: width - 80,
  },

  // Step 1 - Upload
  uploadButtons: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    paddingHorizontal: 30,
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

  // Step 2 Image Container
  step2ImageContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },

  inputSection: {
    justifyContent: 'flex-start',
    marginTop: 10,
    minHeight: 200,
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
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    gap: 8,
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
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    minHeight: 140,
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
    minHeight: 108,
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

  // Step 3 - Generate
  step3Content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  step3ImageContainer: {
    width: 160,
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  step3PreviewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  designSummary: {
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.9,
  },

  // Generate Button
  generateButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 24,
    marginBottom: 20,
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



});