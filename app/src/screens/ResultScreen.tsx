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
  // Removed Animated import - no longer needed
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
// Removed gesture handler imports - no longer needed
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
  
  // Modal state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalImageType, setModalImageType] = useState<'original' | 'transformed'>('transformed');
  
  // Main image state (simplified - no zoom/pan)
  
  // Modal state (simplified - no zoom/pan)
  
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

  // Modal functions
  const openModal = (imageType: 'original' | 'transformed' = 'transformed') => {
    setModalImageType(imageType);
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
  };

  const toggleModalImage = () => {
    setModalImageType(modalImageType === 'original' ? 'transformed' : 'original');
  };

  // Main image functions (simplified - no zoom/pan)

  // Modal functions (simplified - no zoom/pan)

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
      {/* Background Image */}
      <Image 
        source={require('../../assets/background.png')} 
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      {/* Fixed Header */}
      <View style={[styles.fixedHeader, { backgroundColor: 'transparent' }]}>
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backButtonText, { color: theme.colors.text.primary }]}>‹</Text>
        </TouchableOpacity>
        
        {/* Logo and Title */}
        <View style={styles.headerContent}>
          <Image 
            source={require('../../assets/re-vibe.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.title, { color: theme.colors.text.primary }]}>
            Your Design
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
            Here's your transformed space
          </Text>
        </View>
      </View>
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* Generated Image Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.background.secondary }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>
              {isShowingOriginal ? 'Original Space' : 'Transformed Space'}
            </Text>
            <Text style={[styles.cardSubtitle, { color: theme.colors.text.secondary }]}>
              {isShowingOriginal ? 'Your original photo' : 'AI-enhanced design based on your theme'}
            </Text>            
          </View>
          
            <View style={styles.imageContainer}>
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
             
             {/* Expand Button */}
             <TouchableOpacity
               style={[styles.expandButton, { backgroundColor: theme.colors.primary.main }]}
               onPress={() => openModal(isShowingOriginal ? 'original' : 'transformed')}
             >
               <Text style={[styles.expandButtonText, { color: theme.colors.primary.contrast }]}>
                 ⛶
               </Text>
             </TouchableOpacity>
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
                      style={styles.amazonButton}
                      onPress={() => openAmazonLink(product.amazonLink!)}
                    >
                      {isChecked ? (
                        <View style={[styles.amazonButtonContent, { 
                          backgroundColor: theme.colors.background.primary,
                          borderColor: theme.colors.primary.main,
                          borderWidth: 1
                        }]}>
                          <Text style={[styles.amazonButtonText, { color: theme.colors.primary.main }]}>
                            Purchased
                          </Text>
                        </View>
                      ) : (
                        <LinearGradient
                          colors={theme.colors.gradient.primary}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.amazonButtonContent}
                        >
                          <Text style={[styles.amazonButtonText, { color: theme.colors.text.primary }]}>
                            Buy Now
                          </Text>
                        </LinearGradient>
                      )}
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

      {/* Full-Screen Image Modal */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { backgroundColor: 'rgba(0, 0, 0, 0.8)' }]}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={closeModal}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
            
            <View style={styles.modalTitleContainer}>
              <Text style={styles.modalTitle}>
                {modalImageType === 'original' ? 'Original Image' : 'Transformed Image'}
              </Text>
            </View>
          </View>

          {/* Modal Image - Tap to Toggle */}
          <TouchableOpacity 
            style={styles.modalImageContainer}
            onPress={toggleModalImage}
            activeOpacity={0.9}
          >
            {modalImageType === 'original' ? (
              originalImage ? (
                <Image 
                  source={{ uri: `data:image/jpeg;base64,${originalImage}` }} 
                  style={styles.modalImage} 
                  fadeDuration={0}
                  resizeMode="contain"
                />
              ) : (
                <View style={[styles.modalNoImage, { backgroundColor: theme.colors.background.primary }]}>
                  <Text style={[styles.modalNoImageText, { color: theme.colors.text.secondary }]}>
                    No original image available
                  </Text>
                </View>
              )
            ) : (
              generatedImage ? (
                <Image 
                  source={{ uri: `data:image/jpeg;base64,${generatedImage}` }} 
                  style={styles.modalImage} 
                  fadeDuration={0}
                  resizeMode="contain"
                />
              ) : (
                <View style={[styles.modalNoImage, { backgroundColor: theme.colors.background.primary }]}>
                  <Text style={[styles.modalNoImageText, { color: theme.colors.text.secondary }]}>
                    No image available
                  </Text>
                </View>
              )
            )}
          </TouchableOpacity>

          {/* Modal Controls */}
          <View style={[styles.modalControls, { backgroundColor: 'rgba(0, 0, 0, 0.8)' }]}>
            <Text style={styles.modalInstructions}>
              Tap the image to switch between original and transformed
            </Text>
          </View>
        </View>
      </Modal>
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
  backButton: {
    position: 'absolute',
    top: 50, // Adjusted to align with logo center
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1001,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  backButtonText: {
    fontSize: 24,
    fontWeight: '300',
    color: '#FFFFFF',
    marginLeft: -1,
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
    borderRadius: 8,
    overflow: 'hidden',
  },
  amazonButtonContent: {
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
  // Expand Button Styles
  expandButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  expandButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
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
  modalCloseText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  modalTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: width,
    height: Dimensions.get('window').height - 200,
  },
  modalNoImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalNoImageText: {
    fontSize: 16,
    textAlign: 'center',
  },
  modalControls: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  modalControlButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  modalControlText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalInstructions: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    flex: 1,
    marginLeft: 16,
  },
});
