import React, { useState, useRef, useEffect } from 'react';
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
  Animated,
} from 'react-native';
import { PinchGestureHandler, PanGestureHandler, State } from 'react-native-gesture-handler';
import { useTheme } from '../theme/ThemeProvider';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { designStorage } from '../services/DesignStorage';

const { width } = Dimensions.get('window');

type ResultScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Result'>;

interface ResultScreenProps {
  navigation: ResultScreenNavigationProp;
  route: {
    params: {
      generatedImage: string;
      originalImage: string;
      products: Array<{
        name: string;
        type: string;
        qty: number;
        color?: string;
        estPriceUSD?: number;
        keywords?: string[];
        placement?: {
          note?: string;
          bboxNorm?: number[];
        };
        amazonLink?: string;
      }>;
      designId?: string;
    };
  };
}

export const ResultScreen: React.FC<ResultScreenProps> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { generatedImage, originalImage, products, designId } = route.params;
  
  // Swipe comparison state
  const [isShowingOriginal, setIsShowingOriginal] = useState(false);
  
  // Zoom state
  const scale = useRef(new Animated.Value(1)).current;
  const savedScale = useRef(1);
  const [isZoomed, setIsZoomed] = useState(false);
  
  // Pan state
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const savedTranslateX = useRef(0);
  const savedTranslateY = useRef(0);
  
  // Shopping list state
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  // Load checkbox states when component mounts
  useEffect(() => {
    const loadCheckboxStates = async () => {
      if (designId) {
        try {
          const savedStates = await designStorage.loadCheckboxStates(designId);
          setCheckedItems(savedStates);
        } catch (error) {
          console.error('Error loading checkbox states:', error);
        }
      }
    };

    loadCheckboxStates();
  }, [designId]);

  const shareImage = async () => {
    try {
      await Share.share({
        message: 'Check out this AI-generated design!',
        url: `data:image/jpeg;base64,${generatedImage}`,
      });
    } catch (error) {
      console.error('Error sharing image:', error);
    }
  };

  const openAmazonLink = (url: string) => {
    Linking.openURL(url);
  };

  // Simple tap to toggle between images
  const toggleImage = () => {
    setIsShowingOriginal(!isShowingOriginal);
  };

  // Zoom gesture handlers
  const onPinchGestureEvent = Animated.event(
    [{ nativeEvent: { scale: scale } }],
    { useNativeDriver: true }
  );

  const onPinchHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      // Gesture is active, allow zooming
    } else if (event.nativeEvent.state === State.END) {
      // Gesture ended, save the scale
      savedScale.current = Math.max(1, Math.min(3, savedScale.current * event.nativeEvent.scale));
      scale.setValue(savedScale.current);
      
      if (savedScale.current > 1) {
        setIsZoomed(true);
      } else {
        setIsZoomed(false);
      }
    }
  };

  // Pan gesture handlers with proper offset management and real-time constraints
  const onPanGestureEvent = (event: any) => {
    const { translationX: panX, translationY: panY } = event.nativeEvent;
    
    // Calculate bounds based on current scale
    const currentScale = savedScale.current;
    const containerWidth = width - 88;
    const containerHeight = 280;
    const scaledWidth = containerWidth * currentScale;
    const scaledHeight = containerHeight * currentScale;
    const overflowX = (scaledWidth - containerWidth) / 2;
    const overflowY = (scaledHeight - containerHeight) / 2;
    
    // Calculate new position with constraints
    const newTranslateX = savedTranslateX.current + panX;
    const newTranslateY = savedTranslateY.current + panY;
    
    const constrainedX = Math.max(-overflowX, Math.min(overflowX, newTranslateX));
    const constrainedY = Math.max(-overflowY, Math.min(overflowY, newTranslateY));
    
    // Set the constrained values
    translateX.setValue(constrainedX);
    translateY.setValue(constrainedY);
  };

  const onPanHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      // Gesture started - no need to set offsets since we're handling it directly
    } else if (event.nativeEvent.state === State.END) {
      // Gesture ended, save the current constrained position
      const { translationX: panX, translationY: panY } = event.nativeEvent;
      
      // Calculate bounds based on current scale
      const currentScale = savedScale.current;
      const containerWidth = width - 88;
      const containerHeight = 280;
      const scaledWidth = containerWidth * currentScale;
      const scaledHeight = containerHeight * currentScale;
      const overflowX = (scaledWidth - containerWidth) / 2;
      const overflowY = (scaledHeight - containerHeight) / 2;
      
      // Calculate new position
      const newTranslateX = savedTranslateX.current + panX;
      const newTranslateY = savedTranslateY.current + panY;
      
      // Apply constraints
      const constrainedX = Math.max(-overflowX, Math.min(overflowX, newTranslateX));
      const constrainedY = Math.max(-overflowY, Math.min(overflowY, newTranslateY));
      
      // Save the constrained position
      savedTranslateX.current = constrainedX;
      savedTranslateY.current = constrainedY;
    }
  };

  // Reset zoom and pan
  const resetZoom = () => {
    savedScale.current = 1;
    savedTranslateX.current = 0;
    savedTranslateY.current = 0;
    scale.setValue(1);
    translateX.setValue(0);
    translateY.setValue(0);
    setIsZoomed(false);
  };

  // Shopping list functions
  const toggleCheckbox = async (index: number) => {
    setCheckedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      
      // Save checkbox states to database
      if (designId) {
        designStorage.saveCheckboxStates(designId, newSet).catch(error => {
          console.error('Error saving checkbox states:', error);
        });
      }
      
      return newSet;
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={[styles.title, { color: theme.colors.text.primary }]}>
            Your Design
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
            Here's your transformed space
          </Text>
        </View>

        {/* Generated Image Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.background.secondary }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>
              {isShowingOriginal ? 'Original Space' : 'Transformed Space'}
            </Text>
            <Text style={[styles.cardSubtitle, { color: theme.colors.text.secondary }]}>
              {isShowingOriginal ? 'Your original photo' : 'AI-enhanced design based on your theme'}
            </Text>
            <Text style={[styles.swipeHint, { color: theme.colors.text.secondary }]}>
              Tap to compare • Pinch to zoom • Drag when zoomed
            </Text>
          </View>
          
          <View style={styles.imageContainer}>
            <PanGestureHandler
              onGestureEvent={onPanGestureEvent}
              onHandlerStateChange={onPanHandlerStateChange}
              enabled={isZoomed}
            >
              <Animated.View>
                <PinchGestureHandler
                  onGestureEvent={onPinchGestureEvent}
                  onHandlerStateChange={onPinchHandlerStateChange}
                >
                  <Animated.View style={[styles.imageWrapper, { 
                    transform: [
                      { scale },
                      { translateX },
                      { translateY }
                    ] 
                  }]}>
                    <TouchableOpacity onPress={toggleImage} activeOpacity={0.9}>
                      {isShowingOriginal ? (
                        // Show Original Image
                        originalImage ? (
                          <Image 
                            source={{ uri: `data:image/jpeg;base64,${originalImage}` }} 
                            style={styles.generatedImage} 
                            fadeDuration={0}
                          />
                        ) : (
                          <View style={[styles.noImageContainer, { backgroundColor: theme.colors.background.primary }]}>
                            <Text style={[styles.noImageText, { color: theme.colors.text.secondary }]}>
                              No original image available
                            </Text>
                          </View>
                        )
                      ) : (
                        // Show Generated Image
                        generatedImage ? (
                          <Image 
                            source={{ uri: `data:image/jpeg;base64,${generatedImage}` }} 
                            style={styles.generatedImage} 
                            fadeDuration={0}
                          />
                        ) : (
                          <View style={[styles.noImageContainer, { backgroundColor: theme.colors.background.primary }]}>
                            <Text style={[styles.noImageText, { color: theme.colors.text.secondary }]}>
                              No image available
                            </Text>
                          </View>
                        )
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                </PinchGestureHandler>
              </Animated.View>
            </PanGestureHandler>
            
            {/* Reset Zoom Button */}
            {isZoomed && (
              <TouchableOpacity
                style={[styles.resetZoomButton, { backgroundColor: theme.colors.secondary.main }]}
                onPress={resetZoom}
              >
                <Text style={[styles.resetZoomText, { color: theme.colors.secondary.contrast }]}>
                  Reset Zoom
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.accent.purple }]}
              onPress={shareImage}
            >
              <Text style={[styles.actionButtonText, { color: theme.colors.text.primary }]}>
                Share Design
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.secondary.main }]}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Design' })}
            >
              <Text style={[styles.actionButtonText, { color: theme.colors.secondary.contrast }]}>
                Create Another
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Products Section */}
        {products && products.length > 0 ? (
          <View style={styles.productsSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                Shopping List
              </Text>
              <Text style={[styles.sectionSubtitle, { color: theme.colors.text.secondary }]}>
                {checkedItems.size} of {products.length} items checked
              </Text>
            </View>

            {products.map((product, index) => {
              const isChecked = checkedItems.has(index);
              return (
                <View key={index} style={[styles.shoppingListItem, { 
                  backgroundColor: theme.colors.background.secondary,
                  opacity: isChecked ? 0.6 : 1
                }]}>
                  {/* Checkbox and Main Content */}
                  <View style={styles.listItemContent}>
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
                    
                    <View style={styles.itemDetails}>
                      <View style={styles.itemHeader}>
                        <Text style={[styles.itemName, { 
                          color: theme.colors.text.primary,
                          textDecorationLine: isChecked ? 'line-through' : 'none'
                        }]}>
                          {product.name}
                        </Text>
                        <View style={[styles.quantityBadge, { backgroundColor: theme.colors.primary.main }]}>
                          <Text style={[styles.quantityText, { color: theme.colors.primary.contrast }]}>
                            {product.qty}x
                          </Text>
                        </View>
                      </View>
                      
                      <Text style={[styles.itemType, { color: theme.colors.text.secondary }]}>
                        {product.type}
                      </Text>
                      
                      {product.estPriceUSD && (
                        <Text style={[styles.itemPrice, { color: theme.colors.primary.main }]}>
                          ${product.estPriceUSD}
                        </Text>
                      )}
                      
                      {product.placement?.note && (
                        <Text style={[styles.placementNote, { color: theme.colors.text.secondary }]}>
                          📍 {product.placement.note}
                        </Text>
                      )}
                    </View>
                  </View>
                  
                  {/* Amazon Button */}
                  {product.amazonLink && (
                    <TouchableOpacity
                      style={[styles.amazonButton, { 
                        backgroundColor: isChecked ? theme.colors.background.primary : theme.colors.primary.main,
                        borderColor: theme.colors.primary.main,
                        borderWidth: 1
                      }]}
                      onPress={() => openAmazonLink(product.amazonLink!)}
                    >
                      <Text style={[styles.amazonButtonText, { 
                        color: isChecked ? theme.colors.primary.main : theme.colors.primary.contrast 
                      }]}>
                        {isChecked ? 'Purchased' : 'Buy Now'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: theme.colors.background.secondary }]}>
            <View style={styles.noProductsContainer}>
              <Text style={[styles.noProductsTitle, { color: theme.colors.text.primary }]}>
                No Products Available
              </Text>
              <Text style={[styles.noProductsText, { color: theme.colors.text.secondary }]}>
                The AI couldn't identify specific products in this design. Try generating a new design or check the console for more details.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: width - 60,
    opacity: 0.8,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
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
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    position: 'relative',
    width: width - 88, // Account for card padding (20px each side) + scroll padding (16px each side)
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
  imageWrapper: {
    width: width - 88,
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
  },
  generatedImage: {
    width: width - 88,
    height: 280,
    borderRadius: 20,
    resizeMode: 'cover',
  },
  resetZoomButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  resetZoomText: {
    fontSize: 12,
    fontWeight: '600',
  },
  swipeHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.6,
    fontStyle: 'italic',
  },
  noImageContainer: {
    width: width - 88,
    height: 280,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  noImageText: {
    fontSize: 16,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  productsSection: {
    marginTop: 8,
  },
  sectionHeader: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    lineHeight: 22,
    opacity: 0.7,
  },
  // Shopping List Styles
  shoppingListItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemDetails: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemName: {
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
    fontWeight: '600',
  },
  itemType: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  placementNote: {
    fontSize: 13,
    fontStyle: 'italic',
    opacity: 0.8,
  },
  amazonButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  amazonButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  noProductsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noProductsTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  noProductsText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    opacity: 0.7,
    maxWidth: width - 120,
  },
});
