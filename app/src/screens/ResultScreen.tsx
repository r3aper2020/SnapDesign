import React from 'react';
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
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

const { width } = Dimensions.get('window');

type ResultScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Result'>;

interface ResultScreenProps {
  navigation: ResultScreenNavigationProp;
  route: {
    params: {
      generatedImage: string;
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
    };
  };
}

export const ResultScreen: React.FC<ResultScreenProps> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { generatedImage, products } = route.params;

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

  const findProducts = (keywords: string[]) => {
    const searchTerms = keywords.join(' ');
    const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(searchTerms)}&tag=snapdesign-20`;
    Linking.openURL(searchUrl);
  };

  const openAmazonLink = (url: string) => {
    Linking.openURL(url);
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
            Here's your transformed space with product recommendations
          </Text>
        </View>

        {/* Generated Image Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.background.secondary }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>
              Transformed Space
            </Text>
            <Text style={[styles.cardSubtitle, { color: theme.colors.text.secondary }]}>
              AI-enhanced design based on your theme
            </Text>
          </View>
          
          <View style={styles.imageContainer}>
            {generatedImage ? (
              <Image 
                source={{ uri: `data:image/jpeg;base64,${generatedImage}` }} 
                style={styles.generatedImage} 
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.noImageContainer, { backgroundColor: theme.colors.background.primary }]}>
                <Text style={[styles.noImageText, { color: theme.colors.text.secondary }]}>
                  No image available
                </Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.primary.main }]}
              onPress={shareImage}
            >
              <Text style={[styles.actionButtonText, { color: theme.colors.primary.contrast }]}>
                Share Design
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.secondary.main }]}
              onPress={() => navigation.navigate('Design')}
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
                Recommended Products
              </Text>
              <Text style={[styles.sectionSubtitle, { color: theme.colors.text.secondary }]}>
                {products.length} items to complete your design
              </Text>
            </View>

            {products.map((product, index) => (
              <View key={index} style={[styles.productCard, { backgroundColor: theme.colors.background.secondary }]}>
                {/* Product Header */}
                <View style={styles.productHeader}>
                  <View style={styles.productTitleRow}>
                    <Text style={[styles.productName, { color: theme.colors.text.primary }]}>
                      {product.name}
                    </Text>
                    <View style={[styles.productBadge, { backgroundColor: theme.colors.primary.main }]}>
                      <Text style={[styles.productBadgeText, { color: theme.colors.primary.contrast }]}>
                        {product.qty}x
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.productType, { color: theme.colors.text.secondary }]}>
                    {product.type}
                  </Text>
                </View>

                {/* Product Details */}
                <View style={styles.productDetails}>
                  <View style={styles.productInfoRow}>
                    {product.color && (
                      <View style={styles.productInfoItem}>
                        <Text style={[styles.productInfoLabel, { color: theme.colors.text.secondary }]}>
                          Color:
                        </Text>
                        <Text style={[styles.productInfoValue, { color: theme.colors.text.primary }]}>
                          {product.color}
                        </Text>
                      </View>
                    )}
                    {product.estPriceUSD && (
                      <View style={styles.productInfoItem}>
                        <Text style={[styles.productInfoLabel, { color: theme.colors.text.secondary }]}>
                          Price:
                        </Text>
                        <Text style={[styles.productInfoValue, { color: theme.colors.primary.main, fontWeight: '600' }]}>
                          ${product.estPriceUSD}
                        </Text>
                      </View>
                    )}
                  </View>

                  {product.keywords && product.keywords.length > 0 && (
                    <View style={styles.keywordsContainer}>
                      <Text style={[styles.keywordsLabel, { color: theme.colors.text.secondary }]}>
                        Keywords:
                      </Text>
                      <View style={styles.keywordsList}>
                        {product.keywords.map((keyword, idx) => (
                          <View key={idx} style={[styles.keywordTag, { backgroundColor: theme.colors.background.primary }]}>
                            <Text style={[styles.keywordText, { color: theme.colors.text.secondary }]}>
                              {keyword}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {product.placement?.note && (
                    <View style={styles.placementContainer}>
                      <Text style={[styles.placementText, { color: theme.colors.text.secondary }]}>
                        {product.placement.note}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Product Actions */}
                <View style={styles.productActions}>
                  <TouchableOpacity
                    style={[styles.searchButton, { backgroundColor: theme.colors.background.primary }]}
                    onPress={() => findProducts(product.keywords || [product.name])}
                  >
                    <Text style={[styles.searchButtonText, { color: theme.colors.primary.main }]}>
                      Search Similar
                    </Text>
                  </TouchableOpacity>

                  {product.amazonLink && (
                    <TouchableOpacity
                      style={[styles.amazonButton, { backgroundColor: theme.colors.primary.main }]}
                      onPress={() => openAmazonLink(product.amazonLink!)}
                    >
                      <Text style={[styles.amazonButtonText, { color: theme.colors.primary.contrast }]}>
                        View on Amazon
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
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
    padding: 24,
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: width - 80,
    opacity: 0.8,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    marginBottom: 20,
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
    marginBottom: 24,
  },
  generatedImage: {
    width: width - 96,
    height: ((width - 96) * 3) / 4,
    borderRadius: 12,
  },
  noImageContainer: {
    width: width - 96,
    height: ((width - 96) * 3) / 4,
    borderRadius: 12,
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
  productCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  productHeader: {
    marginBottom: 16,
  },
  productTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  productName: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
  },
  productBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  productBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  productType: {
    fontSize: 14,
    opacity: 0.7,
  },
  productDetails: {
    marginBottom: 20,
  },
  productInfoRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
  },
  productInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productInfoLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  productInfoValue: {
    fontSize: 14,
  },
  keywordsContainer: {
    marginBottom: 16,
  },
  keywordsLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  keywordsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  keywordTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  keywordText: {
    fontSize: 12,
    fontWeight: '500',
  },
  placementContainer: {
    alignItems: 'flex-start',
  },
  placementText: {
    fontSize: 14,
    fontStyle: 'italic',
    opacity: 0.8,
  },
  productActions: {
    flexDirection: 'row',
    gap: 12,
  },
  searchButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  searchButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  amazonButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
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
