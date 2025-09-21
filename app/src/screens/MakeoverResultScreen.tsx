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
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { useTheme } from '../theme/ThemeProvider';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { designStorage } from '../services/DesignStorage';
import { endpoints } from '../config/api';

const { width, height } = Dimensions.get('window');

// ============================================================================
// TYPES & INTERFACES
// ============================================================================
type MakeoverResultScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MakeoverResult'>;
type MakeoverResultScreenRouteProp = RouteProp<RootStackParamList, 'MakeoverResult'>;

interface MakeoverResultScreenProps {
  navigation: MakeoverResultScreenNavigationProp;
  route: MakeoverResultScreenRouteProp;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const MakeoverResultScreen: React.FC<MakeoverResultScreenProps> = ({ navigation, route }) => {
  // ============================================================================
  // STATE & HOOKS
  // ============================================================================
  const { theme } = useTheme();
  const { 
    generatedImage = '', 
    originalImage = '', 
    products = [], 
    designId = '', 
    description = ''
  } = route.params;
  
  // Image comparison state
  const [isShowingOriginal, setIsShowingOriginal] = useState(false);
  
  // Variations state
  const [currentVariationIndex, setCurrentVariationIndex] = useState(0);
  const [variations, setVariations] = useState<any[]>([]);
  
  // Products state (can be updated after edits)
  const [currentProducts, setCurrentProducts] = useState(route?.params?.products || []);
  
  // Image preloading state
  const [isPreloading, setIsPreloading] = useState(false);
  const [cachedImageUris, setCachedImageUris] = useState<{[key: string]: string}>({});
  
  // Modal state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalImageType, setModalImageType] = useState<'original' | 'transformed'>('transformed');
  const [lastVariationIndex, setLastVariationIndex] = useState(0);
  
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

  // Load checkbox states and variations when component mounts
  useEffect(() => {
    const loadData = async () => {
      if (designId) {
        try {
          // Load checkbox states
          const savedStates = await designStorage.loadCheckboxStates(designId);
          setCheckedItems(savedStates);
          
          // Load edit history/variations
          const editHistory = await designStorage.getEditsForDesign(designId);
          setVariations(editHistory);
          
          // Preload all images
          const allImages = [
            generatedImage,
            ...editHistory.map(edit => edit.editedImage)
          ].filter(Boolean);
          
          await preloadImages(allImages);
        } catch (error) {
          console.error('Error loading data:', error);
        }
      }
    };

    loadData();
  }, [designId]);

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
        imageBase64: generatedImage,
        description: editInstructions.trim(),
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.editedImageBase64 && data.products) {
        // Save the edit to local storage
        if (designId) {
          try {
            await designStorage.saveEdit({
              designId: designId,
              editInstructions: editInstructions.trim(),
              originalImage: generatedImage,
              editedImage: data.editedImageBase64,
              products: data.products.items || data.products,
              tokenUsage: data.tokenUsage
            });
          } catch (error) {
            console.error('Error saving edit:', error);
          }
        }

        // Update the current screen with the new variation
        // Add the new variation to the variations array
        const newVariation = {
          id: Date.now().toString(), // Temporary ID
          designId: designId || '',
          timestamp: Date.now(),
          editInstructions: editInstructions,
          originalImage: generatedImage,
          editedImage: data.editedImageBase64,
          products: data.products.items || data.products,
          tokenUsage: data.tokenUsage
        };
        
        // Add the new variation to the variations array
        setVariations(prev => [newVariation, ...prev]);
        
        // Cache the new image immediately
        const newImageUri = `data:image/jpeg;base64,${data.editedImageBase64}`;
        setCachedImageUris(prev => ({
          ...prev,
          [`image_1`]: newImageUri // Index 1 for the new variation
        }));
        
        // Preload the new image
        ExpoImage.prefetch([newImageUri]);
        
        // Update products with the new products from the edit
        setCurrentProducts(data.products.items || data.products);
        
        // Switch to the new variation (index 1, since index 0 is the original generated image)
        setCurrentVariationIndex(1);
        
        // Clear the edit modal
        setShowEditModal(false);
        setEditInstructions('');
      } else {
        console.error('No edited image returned from server');
      }
    } catch (error) {
      console.error('Error editing makeover:', error);
    } finally {
      setIsEditing(false);
      setShowEditModal(false);
      setEditInstructions('');
    }
  };

  const toggleImage = () => {
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

  // Get current variation prompt
  const getCurrentVariationPrompt = useCallback(() => {
    if (isShowingOriginal) {
      return "Original photo of your space";
    }
    
    if (currentVariationIndex === 0) {
      // For the first generated makeover, show the actual prompt used
      return description || "Initial AI-generated makeover";
    }
    
    const variation = variations[currentVariationIndex - 1];
    return variation?.editInstructions || "No prompt available";
  }, [isShowingOriginal, currentVariationIndex, description, variations]);

  // Swipe gesture handler for variations
  const onSwipeGesture = useCallback((event: any) => {
    const { translationX, state, velocityX } = event.nativeEvent;
    
    if (state === State.END) {
      const isSwipeLeft = translationX < -30 || velocityX < -500;
      const isSwipeRight = translationX > 30 || velocityX > 500;
      
      if (isSwipeLeft && currentVariationIndex < variations.length) {
        setCurrentVariationIndex(prev => Math.min(prev + 1, variations.length));
      } else if (isSwipeRight && currentVariationIndex > 0) {
        setCurrentVariationIndex(prev => Math.max(prev - 1, 0));
      }
    }
  }, [currentVariationIndex, variations.length]);

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
  const currentImage = useMemo(() => {
    return currentVariationIndex === 0 
      ? generatedImage 
      : variations[currentVariationIndex - 1]?.editedImage;
  }, [currentVariationIndex, generatedImage, variations]);

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
              Your Makeover
            </Text>
            <Text style={[styles.pageSubtitle, { color: theme.colors.text.secondary }]}>
              AI-powered transformation complete
            </Text>
          </View>
          
          {/* Main Image Section */}
          <View style={styles.imageSection}>
          {/* Variation Counter - Always show for consistent spacing */}
          <View style={styles.variationCounter}>
            <Text style={[styles.variationCounterText, { color: theme.colors.text.primary }]}>
              {isShowingOriginal 
                ? 'Original Photo' 
                : (currentVariationIndex === 0 ? 'Generated Makeover' : `Variation ${currentVariationIndex}`)
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
                currentImage ? (
                  <ExpoImage 
                    source={{ 
                      uri: getCachedImageUri(currentImage, currentVariationIndex)
                    }} 
                    style={styles.simpleImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    key={`variation-${currentVariationIndex}`}
                  />
                ) : (
                  <View style={styles.noImagePlaceholder}>
                    <Text style={[styles.noImageText, { color: theme.colors.text.secondary }]}>
                      No image available
                    </Text>
                  </View>
                )
              )}
              
              {/* Variation Dots - Centered at Bottom */}
              <View style={styles.simpleToggleDots}>
                {isShowingOriginal ? (
                  // Show single dot for original photo
                  <View style={[styles.toggleDot, { backgroundColor: theme.colors.primary.main }]} />
                ) : (
                  // Show dots for variations
                  Array.from({ length: variations.length + 1 }, (_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.toggleDot,
                        {
                          backgroundColor: index === currentVariationIndex 
                            ? theme.colors.primary.main 
                            : theme.colors.text.secondary
                        }
                      ]}
                    />
                  ))
                )}
              </View>
              
              {/* Edit Button - Top Left Corner */}
              <TouchableOpacity
                style={[styles.simpleEditButton, { backgroundColor: theme.colors.primary.main }]}
                onPress={handleEditDesign}
                disabled={isEditing}
                activeOpacity={0.8}
              >
                {isEditing ? (
                  <ActivityIndicator size="small" color={theme.colors.primary.contrast} />
                ) : (
                  <Text style={[styles.simpleButtonText, { color: theme.colors.primary.contrast }]}>
                    ✏️
                  </Text>
                )}
              </TouchableOpacity>
              
              {/* Expand Button - Top Right Corner */}
              <TouchableOpacity
                style={[styles.simpleExpandButton, { backgroundColor: theme.colors.primary.main }]}
                onPress={() => openModal(isShowingOriginal ? 'original' : 'transformed')}
              >
                <Text style={[styles.simpleButtonText, { color: theme.colors.primary.contrast }]}>
                  ⛶
                </Text>
              </TouchableOpacity>
              
              {/* Share Button - Bottom Right Corner */}
              <TouchableOpacity
                style={[styles.simpleShareButton, { backgroundColor: theme.colors.primary.main }]}
                onPress={shareImage}
              >
                <Text style={[styles.simpleButtonText, { color: theme.colors.primary.contrast }]}>
                  ⤴
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
          </PanGestureHandler>
          
          {/* Swipe Hint - Always show for consistent spacing */}
          <View style={styles.swipeHint}>
            {isShowingOriginal ? (
              <Text style={[styles.swipeHintText, { color: theme.colors.text.secondary }]}>
                Tap to switch to generated makeover
              </Text>
            ) : variations.length > 0 ? (
              <>
                <Text style={[styles.swipeHintText, { color: theme.colors.text.secondary }]}>
                  ← Swipe to see variations →
                </Text>
                {isPreloading && (
                  <View style={styles.preloadIndicator}>
                    <ActivityIndicator size="small" color={theme.colors.primary.main} />
                    <Text style={[styles.preloadText, { color: theme.colors.text.secondary }]}>
                      Loading variations...
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
                  Your space before AI transformation. This is how your room looked originally before we applied the makeover changes.
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.promptTextLabel, { color: theme.colors.text.secondary }]}>
                  Prompt used:
                </Text>
                <Text style={[styles.promptText, { color: theme.colors.text.primary }]}>
                  {getCurrentVariationPrompt()}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Products Section - Always visible */}
        {currentProducts && currentProducts.length > 0 && (
          <View style={styles.productsSection}>
            <View style={styles.productsHeader}>
              <Text style={[styles.productsTitle, { color: theme.colors.text.primary }]}>
                Shopping List
              </Text>
              <Text style={[styles.productsSubtitle, { color: theme.colors.text.secondary }]}>
                {checkedItems.size} of {currentProducts.length} items
              </Text>
            </View>
            
            <View style={styles.productsList}>
              {currentProducts.map((product: any, index: number) => {
                const isChecked = checkedItems.has(index);
                return (
                  <View key={index} style={[styles.productItem, { 
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    opacity: isChecked ? 0.6 : 1
                  }]}>
                    <View style={styles.productContent}>
                      <TouchableOpacity 
                        style={[styles.checkbox, { 
                          borderColor: theme.colors.primary.main,
                          backgroundColor: isChecked ? theme.colors.primary.main : 'transparent'
                        }]}
                        onPress={() => toggleCheckbox(index)}
                      >
                        {isChecked && (
                          <Text style={[styles.checkmark, { color: theme.colors.primary.contrast }]}>
                            ✓
                          </Text>
                        )}
                      </TouchableOpacity>
                      
                      <View style={styles.productDetails}>
                        <View style={styles.productHeader}>
                          <Text style={[styles.productName, { color: theme.colors.text.primary }]}>
                            {product.name}
                          </Text>
                          <View style={[styles.quantityBadge, { backgroundColor: theme.colors.primary.main }]}>
                            <Text style={[styles.quantityText, { color: theme.colors.primary.contrast }]}>
                              {product.qty}
                            </Text>
                          </View>
                        </View>
                        
                        <Text style={[styles.productType, { color: theme.colors.text.secondary }]}>
                          {product.type}
                        </Text>
                        
                        {product.estPriceUSD && (
                          <Text style={[styles.productPrice, { color: theme.colors.text.primary }]}>
                            ${product.estPriceUSD.toFixed(2)}
                          </Text>
                        )}
                        
                        {product.placement?.note && (
                          <Text style={[styles.placementNote, { color: theme.colors.text.secondary }]}>
                            {product.placement.note}
                          </Text>
                        )}
                      </View>
                    </View>
                    
                    {product.amazonLink && (
                      <TouchableOpacity
                        style={styles.amazonButton}
                        onPress={() => product.amazonLink && Linking.openURL(product.amazonLink)}
                      >
                        <LinearGradient
                          colors={['#FF9500', '#FF6B00']}
                          style={styles.amazonButtonContent}
                        >
                          <Text style={[styles.amazonButtonText, { color: '#FFFFFF' }]}>
                            View on Amazon
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
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
                backgroundColor: theme.colors.primary.main,
                shadowColor: theme.colors.shadow.medium
              }
            ]}
            onPress={closeModal}
          >
            <Text style={[styles.basicModalCloseText, { color: theme.colors.primary.contrast }]}>✕</Text>
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
                currentImage ? (
                  <ExpoImage 
                    source={{ uri: getCachedImageUri(currentImage, currentVariationIndex) }} 
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
          
          {/* Navigation Buttons - Only show when viewing variations */}
          {modalImageType === 'transformed' && variations.length > 0 && (
            <View style={styles.basicModalNavigation}>
              <TouchableOpacity
                style={[
                  styles.basicModalNavButton, 
                  { 
                    backgroundColor: currentVariationIndex === 0 ? theme.colors.text.secondary : theme.colors.primary.main,
                    shadowColor: theme.colors.shadow.medium
                  }
                ]}
                onPress={() => {
                  if (currentVariationIndex > 0) {
                    setCurrentVariationIndex(currentVariationIndex - 1);
                  }
                }}
                disabled={currentVariationIndex === 0}
              >
                <Text style={[styles.basicModalNavText, { color: theme.colors.primary.contrast }]}>←</Text>
              </TouchableOpacity>
              
              <Text style={[
                styles.basicModalNavLabel, 
                { 
                  color: theme.colors.text.primary,
                  backgroundColor: theme.colors.background.secondary,
                  borderColor: theme.colors.border.medium
                }
              ]}>
                {currentVariationIndex === 0 ? 'Original' : `Variation ${currentVariationIndex}`}
              </Text>
              
              <TouchableOpacity
                style={[
                  styles.basicModalNavButton, 
                  { 
                    backgroundColor: currentVariationIndex >= variations.length ? theme.colors.text.secondary : theme.colors.primary.main,
                    shadowColor: theme.colors.shadow.medium
                  }
                ]}
                onPress={() => {
                  if (currentVariationIndex < variations.length) {
                    setCurrentVariationIndex(currentVariationIndex + 1);
                  }
                }}
                disabled={currentVariationIndex >= variations.length}
              >
                <Text style={[styles.basicModalNavText, { color: theme.colors.primary.contrast }]}>→</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Simple Toggle Button */}
          <TouchableOpacity
            style={[
              styles.basicModalToggleButton,
              {
                backgroundColor: theme.colors.primary.main,
                shadowColor: theme.colors.shadow.medium
              }
            ]}
            onPress={() => {
              if (modalImageType === 'original') {
                // When switching to variations, go back to last variation we were on
                setCurrentVariationIndex(lastVariationIndex);
                setModalImageType('transformed');
              } else {
                // When switching to original, remember current variation
                setLastVariationIndex(currentVariationIndex);
                setModalImageType('original');
              }
            }}
          >
            <Text style={[styles.basicModalToggleText, { color: theme.colors.primary.contrast }]}>
              {modalImageType === 'original' ? 'Show Variations' : 'Show Original'}
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
              Edit Your Makeover
            </Text>
            <Text style={[styles.editModalSubtitle, { color: theme.colors.text.secondary }]}>
              Describe how you'd like to modify your makeover
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
                style={[styles.editModalButton, styles.editModalSubmitButton, { backgroundColor: theme.colors.primary.main }]}
                onPress={handleEditSubmit}
                disabled={!editInstructions.trim() || isEditing}
              >
                <Text style={[styles.editModalButtonText, { color: theme.colors.primary.contrast }]}>
                  {isEditing ? 'Editing...' : 'Edit Makeover'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.bottomNavButton, { backgroundColor: theme.colors.primary.main }]}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Design' })}
        >
          <Text style={[styles.bottomNavButtonText, { color: theme.colors.primary.contrast }]}>
            New Makeover
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
  variationCounterText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  
  // Image Touchable
  imageTouchable: {
    width: '100%',
    alignItems: 'center',
  },
  
  // Simple Image Container
  simpleImageContainer: {
    width: '100%',
    height: 400,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  
  simpleImage: {
    width: '100%',
    height: '100%',
  },
  
  noImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  
  noImageText: {
    fontSize: 16,
    fontWeight: '500',
  },
  
  // Toggle Dots
  simpleToggleDots: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  
  toggleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  
  // Action Buttons
  simpleEditButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  
  simpleExpandButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  
  simpleShareButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  
  simpleButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  
  // Swipe Hint
  swipeHint: {
    alignItems: 'center',
    marginTop: 16,
    minHeight: 40,
  },
  
  swipeHintText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.7,
  },
  
  preloadIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  
  preloadText: {
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Prompt Text Section
  promptTextSection: {
    paddingHorizontal: 20,
    marginBottom: 0,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 16,
    marginHorizontal: 20,
    minHeight: 60,
  },
  promptTextLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.7,
  },
  promptText: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
  },
  
  // Products Section
  productsSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  
  productsHeader: {
    marginBottom: 16,
  },
  
  productsTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  
  productsSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.7,
  },
  
  productsList: {
    gap: 12,
  },
  
  productItem: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  
  productContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  
  checkmark: {
    fontSize: 14,
    fontWeight: '700',
  },
  
  productDetails: {
    flex: 1,
  },
  
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  
  productName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  
  quantityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 32,
    alignItems: 'center',
  },
  
  quantityText: {
    fontSize: 12,
    fontWeight: '700',
  },
  
  productType: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    opacity: 0.7,
  },
  
  productPrice: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  
  placementNote: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.6,
    fontStyle: 'italic',
  },
  
  amazonButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  
  amazonButtonContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  
  amazonButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Basic Modal
  basicModalContainer: {
    flex: 1,
    position: 'relative',
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
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
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
    paddingTop: 100,
    paddingBottom: 120,
  },
  
  basicModalImageWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  basicModalImage: {
    width: '100%',
    height: '100%',
    maxWidth: width - 40,
    maxHeight: height - 220,
  },
  
  basicModalNavigation: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  
  basicModalNavButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  
  basicModalNavText: {
    fontSize: 20,
    fontWeight: '700',
  },
  
  basicModalNavLabel: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  
  basicModalToggleButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  
  basicModalToggleText: {
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Edit Modal
  editModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  
  editModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  
  editModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  
  editModalSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.7,
    marginBottom: 24,
  },
  
  editModalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  
  editModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  
  editModalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  
  editModalCancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  
  editModalSubmitButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  
  editModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
