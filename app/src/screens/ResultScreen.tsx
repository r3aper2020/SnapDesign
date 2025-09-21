import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  SafeAreaView,
  Share,
  Linking,
  Dimensions,
  StyleSheet,
  Modal,
  TextInput,
  Animated,
  FlatList,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
// import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeProvider';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { designStorage } from '../services/DesignStorage';
import { endpoints } from '../config/api';
import { ProductsList, CleaningStepsList } from '../components';

const { width, height } = Dimensions.get('window');

// ============================================================================
// TYPES & INTERFACES
// ============================================================================
type ResultScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Result'>;
type ResultScreenRouteProp = RouteProp<RootStackParamList, 'Result'>;

interface CleaningStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  estimatedTime?: string;
}

interface ResultScreenProps {
  navigation: ResultScreenNavigationProp;
  route: ResultScreenRouteProp;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const ResultScreen: React.FC<ResultScreenProps> = ({ navigation, route }) => {
  // ============================================================================
  // STATE & HOOKS
  // ============================================================================
  const { theme } = useTheme();
  const { 
    generatedImage = '', 
    originalImage = '', 
    products = [], 
    cleaningSteps = [],
    designId = '', 
    description = '',
    serviceType = 'design'
  } = route.params;
  
  // Handle different parameter names for makeover vs design
  const currentImage = serviceType === 'makeover' 
    ? (route.params as any).editedImage || generatedImage 
    : generatedImage;
  
  // Image comparison state
  const [isShowingOriginal, setIsShowingOriginal] = useState(false);
  
  // Edits state
  const [currentEditIndex, setCurrentEditIndex] = useState(0);
  const [edits, setEdits] = useState<any[]>([]);
  
  // Products state (can be updated after edits)
  const [currentProducts, setCurrentProducts] = useState(route?.params?.products || []);
  
  // Cleaning steps state (for declutter service)
  const [currentCleaningSteps, setCurrentCleaningSteps] = useState<CleaningStep[]>(cleaningSteps);
  
  // Image preloading state
  const [isPreloading, setIsPreloading] = useState(false);
  const [cachedImageUris, setCachedImageUris] = useState<{[key: string]: string}>({});
  
  // Modal state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalImageType, setModalImageType] = useState<'original' | 'transformed'>('transformed');
  const [lastEditIndex, setLastEditIndex] = useState(0);
  
  // Shopping list state
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  
  // Edit functionality state
  const [isEditing, setIsEditing] = useState(false);
  const [editInstructions, setEditInstructions] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  
  

  // Animation for pulsing glow
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Preload and cache images
  const preloadImages = async (imageList: string[]) => {
    setIsPreloading(true);
    
    try {
      // Convert all base64 images to URIs and cache them
      const newCachedUris: {[key: string]: string} = {};
      
      imageList.forEach((imageBase64, index) => {
        if (imageBase64) {
          const uri = `data:image/jpeg;base64,${imageBase64}`;
          newCachedUris[`image_${index}`] = uri;
        }
      });
      
      setCachedImageUris(newCachedUris);
      
      // Preload all images using ExpoImage's preload
      const imageUris = Object.values(newCachedUris);
      await ExpoImage.prefetch(imageUris);
    } catch (error) {
      console.error('Error preloading images:', error);
    } finally {
      setIsPreloading(false);
    }
  };

  // Load checkbox states and edits when component mounts
  useEffect(() => {
    const loadData = async () => {
      if (designId) {
        try {
          // Load checkbox states
          const savedStates = await designStorage.loadCheckboxStates(designId);
          setCheckedItems(savedStates);
          
                // Load edit history
                const editHistory = await designStorage.getEditsForDesign(designId);
                setEdits(editHistory);
          
          // Preload all images
          const allImages = [
            currentImage,
            ...editHistory.map(edit => edit.editedImage)
          ].filter(Boolean);
          
          await preloadImages(allImages);
        } catch (error) {
          console.error('Error loading data:', error);
        }
      }
    };

    loadData();
  }, [designId, currentImage]);

  // Start pulsing glow animation
  useEffect(() => {
    const startGlowAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: false,
          }),
        ])
      ).start();
    };

    startGlowAnimation();
  }, [glowAnim]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  const handleEditDesign = () => {
    setShowEditModal(true);
  };


  const shareImage = async () => {
    try {
      const result = await Share.share({
        message: 'Check out my AI-transformed space!',
        url: `data:image/jpeg;base64,${generatedImage}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleEditSubmit = async () => {
    if (!editInstructions.trim()) return;

    setIsEditing(true);
    setShowEditModal(false);

    try {
      const requestBody = {
        imageBase64: currentImage,
        editInstructions: editInstructions.trim(),
        mimeType: 'image/jpeg',
        serviceType: serviceType
      };


      const response = await fetch(endpoints.edit(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      

      if (data.editedImageBase64) {
        // Save the edit to local storage
        if (designId) {
          try {
            await designStorage.saveEdit({
              designId: designId,
              editInstructions: editInstructions.trim(),
              originalImage: generatedImage,
              editedImage: data.editedImageBase64,
              products: data.products?.items || data.products || [],
              tokenUsage: data.tokenUsage
            });
          } catch (error) {
            console.error('Error saving edit:', error);
          }
        }

        // Update the current screen with the new edit
        // Add the new edit to the edits array
        const newEdit = {
          id: Date.now().toString(), // Temporary ID
          designId: designId || '',
          timestamp: Date.now(),
          editInstructions: editInstructions,
          originalImage: generatedImage,
          editedImage: data.editedImageBase64,
          products: data.products?.items || data.products || [],
          tokenUsage: data.tokenUsage
        };
        
        // Add the new edit to the edits array
        setEdits(prev => [newEdit, ...prev]);
        
        // Cache the new image immediately
        const newImageUri = `data:image/jpeg;base64,${data.editedImageBase64}`;
        setCachedImageUris(prev => ({
          ...prev,
          [`image_1`]: newImageUri // Index 1 for the new variation
        }));
        
        // Preload the new image
        ExpoImage.prefetch([newImageUri]);
        
        // Update products with the new products from the edit
        setCurrentProducts(data.products?.items || data.products || []);
        
        // Switch to the new edit (index 1, since index 0 is the original generated image)
        setCurrentEditIndex(1);
        
        // Clear the edit modal
        setShowEditModal(false);
        setEditInstructions('');
      } else {
        throw new Error('No edited image returned from server');
      }
    } catch (error) {
      console.error('Error editing design:', error);
    } finally {
      setIsEditing(false);
      setShowEditModal(false);
      setEditInstructions('');
    }
  };

  const toggleImage = () => {
    // Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsShowingOriginal(!isShowingOriginal);
  };

  // Get cached image URI
  const getCachedImageUri = (imageBase64: string, index: number) => {
    const cacheKey = `image_${index}`;
    if (cachedImageUris[cacheKey]) {
      return cachedImageUris[cacheKey];
    }
    // Fallback to direct base64 if not cached yet
    return `data:image/jpeg;base64,${imageBase64}`;
  };


  // Get current edit prompt
  const getCurrentEditPrompt = useCallback(() => {
    if (isShowingOriginal) {
      return "Original photo of your space";
    }
    
    if (currentEditIndex === 0) {
      // For the first generated design, show the actual prompt used
      return description || "Initial AI-generated design";
    }
    
    const edit = edits[currentEditIndex - 1];
    return edit?.editInstructions || "No prompt available";
  }, [isShowingOriginal, currentEditIndex, description, edits]);

  // Swipe gesture handler for edits
  const onSwipeGesture = useCallback((event: any) => {
    const { translationX, state, velocityX } = event.nativeEvent;
    
    if (state === State.END) {
      const isSwipeLeft = translationX < -30 || velocityX < -500;
      const isSwipeRight = translationX > 30 || velocityX > 500;
      
      if (isSwipeLeft && currentEditIndex < edits.length) {
        // Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCurrentEditIndex(prev => Math.min(prev + 1, edits.length));
      } else if (isSwipeRight && currentEditIndex > 0) {
        // Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCurrentEditIndex(prev => Math.max(prev - 1, 0));
      }
    }
  }, [currentEditIndex, edits.length]);

  const openModal = (imageType: 'original' | 'transformed' = 'transformed') => {
    setModalImageType(imageType);
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
  };


  const toggleCheckbox = async (index: number) => {
    setCheckedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      
      if (designId) {
        designStorage.saveCheckboxStates(designId, newSet).catch(error => {
          console.error('Error saving checkbox states:', error);
        });
      }
      
      return newSet;
    });
  };


  // Memoize current image to prevent recalculation on every render
  const displayImage = useMemo(() => {
    try {
      return currentEditIndex === 0 
        ? currentImage 
        : edits[currentEditIndex - 1]?.editedImage;
    } catch (error) {
      console.error('Error calculating display image:', error);
      return currentImage; // Fallback to original image
    }
  }, [currentEditIndex, currentImage, edits]);

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
      
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section - Image + Prompt fills viewport */}
        <View style={styles.heroSection}>
          {/* Page Header - Matching DesignScreen */}
          <View style={styles.pageHeader}>
            <Text style={[styles.pageTitle, { color: theme.colors.text.primary }]}>
              Your Design
            </Text>
            <Text style={[styles.pageSubtitle, { color: theme.colors.text.secondary }]}>
              AI-powered transformation complete
            </Text>
          </View>
          
          {/* Main Image Section */}
          <View style={styles.imageSection}>
          {/* Edit Counter - Always show for consistent spacing */}
          <View style={styles.variationCounter}>
            <Text style={[styles.variationCounterText, { color: theme.colors.text.primary }]}>
              {isShowingOriginal 
                ? 'Original Photo' 
                : (currentEditIndex === 0 ? 'Generated Design' : `Edit ${currentEditIndex}`)
              }
            </Text>
          </View>
          
          <PanGestureHandler
            onHandlerStateChange={onSwipeGesture}
            activeOffsetX={[-15, 15]}
            failOffsetY={[-20, 20]}
          >
            <TouchableOpacity 
              style={styles.imageTouchable}
              onPress={toggleImage}
              activeOpacity={0.95}
            >
            {/* Simple Image Container with Button Overlays */}
            <View style={styles.simpleImageContainer}>
              {isShowingOriginal ? (
                originalImage ? (
                  <ExpoImage 
                    source={{ uri: getCachedImageUri(originalImage, -1) }} 
                    style={styles.simpleImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View style={styles.noImagePlaceholder}>
                    <Text style={[styles.noImageText, { color: theme.colors.text.secondary }]}>
                      No original image
                    </Text>
                  </View>
                )
              ) : (
                displayImage ? (
                  <ExpoImage 
                    source={{ 
                      uri: getCachedImageUri(displayImage, currentEditIndex)
                    }} 
                    style={styles.simpleImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    key={`edit-${currentEditIndex}`}
                  />
                ) : (
                  <View style={styles.noImagePlaceholder}>
                    <Text style={[styles.noImageText, { color: theme.colors.text.secondary }]}>
                      No image available
                    </Text>
                  </View>
                )
              )}
              
              {/* Edit Dots - Centered at Bottom */}
              <View style={styles.simpleToggleDots}>
                {isShowingOriginal ? (
                  // Show single dot for original photo
                  <View style={[styles.toggleDot, { backgroundColor: theme.colors.button.accent }]} />
                ) : (
                  // Show dots for edits
                  Array.from({ length: edits.length + 1 }, (_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.toggleDot,
                        {
                          backgroundColor: index === currentEditIndex 
                            ? theme.colors.button.accent 
                            : theme.colors.text.secondary
                        }
                      ]}
                    />
                  ))
                )}
              </View>
              
              {/* Edit Button - Top Left Corner (only for design and makeover) */}
              {serviceType !== 'declutter' && (
                <TouchableOpacity
                  style={[styles.editButton, { backgroundColor: theme.colors.button.accent }]}
                  onPress={handleEditDesign}
                  disabled={isEditing}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.editButtonText, { color: theme.colors.primary.contrast }]}>
                    Edit
                  </Text>
                </TouchableOpacity>
              )}
              
              {/* Processing Overlay */}
              {isEditing && (
                <View style={styles.processingOverlay}>
                  <View style={styles.processingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.button.accent} />
                    <Text style={[styles.processingText, { color: theme.colors.text.primary }]}>
                      Processing your edit...
                    </Text>
                  </View>
                </View>
              )}
              
              {/* Expand Button - Top Right Corner */}
              <TouchableOpacity
                style={[styles.simpleExpandButton, { backgroundColor: theme.colors.button.secondary }]}
                onPress={() => openModal(isShowingOriginal ? 'original' : 'transformed')}
              >
                <MaterialIcons 
                  name="fullscreen" 
                  size={20} 
                  color={theme.colors.primary.contrast}
                />
              </TouchableOpacity>
              
              {/* Share Button - Bottom Right Corner */}
              <TouchableOpacity
                style={[styles.simpleShareButton, { backgroundColor: theme.colors.button.success }]}
                onPress={shareImage}
              >
                <MaterialIcons 
                  name="share" 
                  size={20} 
                  color={theme.colors.primary.contrast}
                />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
          </PanGestureHandler>
          
          
          {/* Swipe Hint - Always show for consistent spacing */}
          <View style={styles.swipeHint}>
            {isShowingOriginal ? (
              <Text style={[styles.swipeHintText, { color: theme.colors.text.secondary }]}>
                Tap to switch to generated design
              </Text>
            ) : edits.length > 0 ? (
              <>
                <Text style={[styles.swipeHintText, { color: theme.colors.text.secondary }]}>
                  ← Swipe to see edits →
                </Text>
                {isPreloading && (
                  <View style={styles.preloadIndicator}>
                    <ActivityIndicator size="small" color={theme.colors.button.secondary} />
                    <Text style={[styles.preloadText, { color: theme.colors.text.secondary }]}>
                      Loading edits...
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={[styles.swipeHintText, { color: theme.colors.text.secondary }]}>
                Tap to switch to original photo
              </Text>
            )}
          </View>
        </View>

          {/* Prompt Text - Under the image - Always show for consistent spacing */}
          <View style={styles.promptTextSection}>
            {isShowingOriginal ? (
              <>
                <Text style={[styles.promptTextLabel, { color: theme.colors.text.secondary }]}>
                  Original Photo
                </Text>
                <Text style={[styles.promptText, { color: theme.colors.text.primary }]}>
                  Your space before AI transformation. This is how your room looked originally before we applied the design changes.
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.promptTextLabel, { color: theme.colors.text.secondary }]}>
                  Prompt used:
                </Text>
                <Text style={[styles.promptText, { color: theme.colors.text.primary }]}>
                  {getCurrentEditPrompt()}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Products/Cleaning Steps Section - Always visible */}
        {((serviceType === 'declutter' && currentCleaningSteps.length > 0) || 
          (serviceType !== 'declutter' && currentProducts.length > 0)) && (
          <View style={styles.productsSection}>
            {/* Conditional Content Based on Service Type */}
            {serviceType === 'declutter' ? (
              <>
                <View style={styles.productsHeader}>
                  <Text style={[styles.productsTitle, { color: theme.colors.text.primary }]}>
                    Cleaning Steps
                  </Text>
                  <Text style={[styles.productsSubtitle, { color: theme.colors.text.secondary }]}>
                    {checkedItems.size} of {currentCleaningSteps.length} steps completed
                  </Text>
                </View>
                <CleaningStepsList
                  cleaningSteps={currentCleaningSteps}
                  checkedItems={checkedItems}
                  onToggleItem={toggleCheckbox}
                />
              </>
            ) : (
              <>
                <View style={styles.productsHeader}>
                  <Text style={[styles.productsTitle, { color: theme.colors.text.primary }]}>
                    Shopping List
                  </Text>
                  <Text style={[styles.productsSubtitle, { color: theme.colors.text.secondary }]}>
                    {checkedItems.size} of {currentProducts.length} items
                  </Text>
                </View>
                <ProductsList
                  products={currentProducts}
                  checkedItems={checkedItems}
                  onToggleItem={toggleCheckbox}
                />
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* Basic Image Modal */}
      <Modal
        visible={isModalVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={[styles.basicModalContainer, { backgroundColor: theme.colors.background.primary }]}>
          {/* Gradient Overlay */}
          <LinearGradient
            colors={[
              `${theme.colors.background.primary}CC`, 
              'transparent', 
              'transparent', 
              `${theme.colors.background.primary}CC`
            ]}
            locations={[0, 0.1, 0.7, 1]}
            style={styles.basicModalGradient}
          />
          
          {/* Close Button */}
          <TouchableOpacity
            style={[
              styles.basicModalCloseButton, 
              { 
                backgroundColor: theme.colors.button.secondary,
                shadowColor: theme.colors.shadow.medium
              }
            ]}
            onPress={closeModal}
          >
            <MaterialIcons 
              name="close" 
              size={20} 
              color={theme.colors.primary.contrast}
            />
          </TouchableOpacity>
          
          {/* Image */}
          <View style={styles.basicModalImageContainer}>
            <View style={styles.basicModalImageWrapper}>
              {modalImageType === 'original' ? (
                originalImage ? (
                  <ExpoImage 
                    source={{ uri: getCachedImageUri(originalImage, -1) }} 
                    style={styles.basicModalImage} 
                    contentFit="contain"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <Text>No original image</Text>
                )
              ) : (
                displayImage ? (
                  <ExpoImage 
                    source={{ uri: getCachedImageUri(displayImage, currentEditIndex) }} 
                    style={styles.basicModalImage} 
                    contentFit="contain"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <Text>No image available</Text>
                )
              )}
            </View>
          </View>
          
          {/* Navigation Buttons - Only show when viewing edits (not for declutter) */}
          {modalImageType === 'transformed' && edits.length > 0 && serviceType !== 'declutter' && (
            <View style={styles.basicModalNavigation}>
              <TouchableOpacity
                style={[
                  styles.basicModalNavButton, 
                  { 
                    backgroundColor: currentEditIndex === 0 ? theme.colors.text.secondary : theme.colors.button.accent,
                    shadowColor: theme.colors.shadow.medium
                  }
                ]}
                onPress={() => {
                  if (currentEditIndex > 0) {
                    setCurrentEditIndex(currentEditIndex - 1);
                  }
                }}
                disabled={currentEditIndex === 0}
              >
                <MaterialIcons 
                  name="chevron-left" 
                  size={20} 
                  color={theme.colors.primary.contrast}
                />
              </TouchableOpacity>
              
              <Text style={[
                styles.basicModalNavLabel, 
                { 
                  color: theme.colors.text.primary,
                  backgroundColor: theme.colors.background.secondary,
                  borderColor: theme.colors.border.medium
                }
              ]}>
                {currentEditIndex === 0 ? 'Original' : `Edit ${currentEditIndex}`}
              </Text>
              
              <TouchableOpacity
                style={[
                  styles.basicModalNavButton, 
                  { 
                    backgroundColor: currentEditIndex >= edits.length ? theme.colors.text.secondary : theme.colors.button.accent,
                    shadowColor: theme.colors.shadow.medium
                  }
                ]}
                onPress={() => {
                  if (currentEditIndex < edits.length) {
                    setCurrentEditIndex(currentEditIndex + 1);
                  }
                }}
                disabled={currentEditIndex >= edits.length}
              >
                <MaterialIcons 
                  name="chevron-right" 
                  size={20} 
                  color={theme.colors.primary.contrast}
                />
              </TouchableOpacity>
            </View>
          )}
          
          {/* Simple Toggle Button */}
          <TouchableOpacity
            style={[
              styles.basicModalToggleButton,
              {
                backgroundColor: theme.colors.button.accent,
                shadowColor: theme.colors.shadow.medium
              }
            ]}
            onPress={() => {
              if (modalImageType === 'original') {
                // When switching to edits, go back to last edit we were on
                setCurrentEditIndex(lastEditIndex);
                setModalImageType('transformed');
              } else {
                // When switching to original, remember current edit
                setLastEditIndex(currentEditIndex);
                setModalImageType('original');
              }
            }}
          >
            <Text style={[styles.basicModalToggleText, { color: theme.colors.primary.contrast }]}>
              {modalImageType === 'original' ? 'Show Edits' : 'Show Original'}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.editModalContainer}>
          <View style={[styles.editModalContent, { backgroundColor: theme.colors.background.primary }]}>
            <Text style={[styles.editModalTitle, { color: theme.colors.text.primary }]}>
              Edit Your Design
            </Text>
            <Text style={[styles.editModalSubtitle, { color: theme.colors.text.secondary }]}>
              Describe how you'd like to modify your design
            </Text>
            
            <TextInput
              style={[styles.editModalInput, { 
                backgroundColor: theme.colors.background.secondary,
                color: theme.colors.text.primary,
                borderColor: theme.colors.border.light
              }]}
              value={editInstructions}
              onChangeText={setEditInstructions}
              placeholder="e.g., 'Make it more colorful', 'Add plants', 'Change to modern style'"
              placeholderTextColor={theme.colors.text.secondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            
            <View style={styles.editModalButtons}>
              <TouchableOpacity
                style={[styles.editModalButton, styles.editModalCancelButton, { borderColor: theme.colors.border.light }]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={[styles.editModalButtonText, { color: theme.colors.text.secondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.editModalButton, styles.editModalSubmitButton, { backgroundColor: theme.colors.button.accent }]}
                onPress={handleEditSubmit}
                disabled={!editInstructions.trim() || isEditing}
              >
                <Text style={[styles.editModalButtonText, { color: theme.colors.primary.contrast }]}>
                  {isEditing ? 'Editing...' : 'Edit Design'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.bottomNavButton, { backgroundColor: theme.colors.button.primary }]}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Design' })}
        >
          <Text style={[styles.bottomNavButtonText, { color: theme.colors.primary.contrast }]}>
            New Design
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.bottomNavButton, { backgroundColor: theme.colors.background.secondary }]}
          onPress={() => navigation.navigate('MainTabs', { screen: 'SavedDesigns' })}
        >
          <Text style={[styles.bottomNavButtonText, { color: theme.colors.text.primary }]}>
            Saved
          </Text>
        </TouchableOpacity>
      </View>

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
  
  // Hero Section - Fills viewport
  heroSection: {
    minHeight: height - 100, // Account for status bar and bottom nav
    justifyContent: 'center',
    paddingBottom: 20,
  },
  
  // Page Header - Matching DesignScreen
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
  
  // Floating Edit Button
  floatingEditButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  floatingEditButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Scroll Content
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    flexGrow: 1,
  },
  
  // Image Section
  imageSection: {
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  
  // Variation Counter
  variationCounter: {
    alignItems: 'center',
    marginBottom: 4,
  },
  variationCounterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  variationCounterText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  variationCounterSubtext: {
    fontSize: 14,
    opacity: 0.7,
  },
  
  // Prompt Text Section
  promptTextSection: {
    paddingHorizontal: 20,
    marginBottom: 0,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 16,
    marginHorizontal: 20,
    minHeight: 60, // Minimum height for 2 lines
  },
  promptTextLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  promptText: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
    opacity: 0.95,
    fontWeight: '500',
  },
  
  // Prompt Container
  promptContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    minHeight: 80,
  },
  glowEffect: {
    position: 'absolute',
    width: width - 80,
    aspectRatio: 4/3,
    borderRadius: 24,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 25,
    elevation: 15,
    zIndex: 1,
  },
  mainImage: {
    width: width - 48,
    height: width * 1.2,
    borderRadius: 24,
    zIndex: 2,
  },
  imageTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainImageFixed: {
    width: width * 1.25,
    aspectRatio: 4/3,
    borderRadius: 0,
  },
  // Simple Image Container Styles
  simpleImageContainer: {
    position: 'relative',
    alignSelf: 'center',
    borderRadius: 20,
    overflow: 'hidden',
  },
  simpleImage: {
    width: (width - 40) * 0.85,
    height: (width - 40) * 1.2 * 0.85,
  },
  simpleToggleDots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  processingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  processingText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
    textAlign: 'center',
  },
  simpleExpandButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  simpleShareButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  simpleButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  noImagePlaceholder: {
    width: width - 80,
    height: (width - 80) * 0.75,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
  },
  
  // Image Toggle Indicator
  imageToggleIndicator: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  toggleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  
  // Variation Indicators
  variationIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  variationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.7,
  },
  
  // Expand Button
  expandButton: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
  expandButtonTopLeft: {
    top: 8,
    left: 8, // Position at screen edge
  },
  expandButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  
  // Share Button
  shareButton: {
    position: 'absolute',
    bottom: 8,
    right: 8, // Position at screen edge
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
  shareButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  // Action Buttons
  actionButtonsSection: {
    marginBottom: 32,
  },
  primaryActions: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 16,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Products Section
  productsSection: {
    marginBottom: 20,
  },
  productsHeader: {
    marginBottom: 20,
  },
  productsTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  productsSubtitle: {
    fontSize: 14,
    opacity: 0.8,
    fontWeight: '500',
  },
  productsList: {
    gap: 16,
  },
  productItem: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  productContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  checkmark: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  productDetails: {
    flex: 1,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
    lineHeight: 22,
  },
  quantityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 36,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quantityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  productType: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  placementNote: {
    fontSize: 13,
    fontStyle: 'italic',
    opacity: 0.8,
  },
  amazonButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  amazonButtonContent: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  amazonButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalToggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalToggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCarouselContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCarouselItem: {
    width: width,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCarouselDots: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  modalCarouselDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  // Simple Modal Styles
  simpleModalImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  simpleModalImageWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  simpleModalImage: {
    width: '100%',
    height: '100%',
  },
  simpleModalPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  simpleModalText: {
    fontSize: 16,
    textAlign: 'center',
  },
  simpleModalNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 20,
  },
  simpleModalNavButton: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  simpleModalNavText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  simpleModalNavLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  simpleModalHint: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  simpleModalHintText: {
    fontSize: 16,
    textAlign: 'center',
    color: 'white',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  // Themed Modal Styles
  basicModalContainer: {
    flex: 1,
  },
  basicModalGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  basicModalCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  basicModalCloseText: {
    fontSize: 18,
    fontWeight: '600',
  },
  basicModalImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
    paddingBottom: 200,
    zIndex: 2,
  },
  basicModalImageWrapper: {
    width: (width - 40) * 1.1,
    height: (width - 40) * 1.2 * 1.1,
  },
  basicModalImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  basicModalToggleButton: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
    left: 20,
    right: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  basicModalToggleText: {
    fontSize: 16,
    fontWeight: '600',
  },
  basicModalNavigation: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  basicModalNavButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  basicModalNavButtonDisabled: {
    // Will be styled dynamically
  },
  basicModalNavText: {
    fontSize: 24,
    fontWeight: '600',
  },
  basicModalNavLabel: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalVariationDots: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  modalVariationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modalSwipeHint: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  modalSwipeHintText: {
    fontSize: 12,
    opacity: 0.6,
    fontStyle: 'italic',
  },
  
  // Edit Modal Styles
  editModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  editModalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  editModalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 20,
  },
  editModalInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  editModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  editModalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  editModalCancelButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  editModalSubmitButton: {
    // backgroundColor set dynamically
  },
  editModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Edit History Styles
  editHistoryList: {
    maxHeight: 300,
    marginBottom: 20,
  },
  editHistoryItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  editHistoryText: {
    fontSize: 14,
    marginBottom: 4,
  },
  editHistoryDate: {
    fontSize: 12,
    opacity: 0.7,
  },
  noEditHistoryText: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
    paddingVertical: 20,
  },
  
  
  
  // Swipe Hint
  swipeHint: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  swipeHintText: {
    fontSize: 12,
    opacity: 0.6,
    fontStyle: 'italic',
  },
  preloadIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  preloadText: {
    fontSize: 12,
    opacity: 0.7,
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