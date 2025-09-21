import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Linking,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeProvider';
import { Product } from '../navigation/AppNavigator';

const { width } = Dimensions.get('window');

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface ProductsListProps {
  products: Product[];
  checkedItems: Set<number>;
  onToggleItem: (index: number) => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const ProductsList: React.FC<ProductsListProps> = ({
  products,
  checkedItems,
  onToggleItem,
}) => {
  const { theme } = useTheme();

  const handleAmazonPress = useCallback(async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Error opening Amazon link:', error);
    }
  }, []);

  const renderProduct = useCallback(({ item, index }: { item: Product; index: number }) => {
    const isChecked = checkedItems.has(index);
    const quantity = item.qty || 1;

    return (
      <View style={[styles.productItem, { 
        backgroundColor: theme.colors.background.secondary,
        borderColor: theme.colors.border.primary 
      }]}>
        <View style={styles.productHeader}>
          <TouchableOpacity
            style={[styles.checkbox, { 
              borderColor: theme.colors.primary.main,
              backgroundColor: isChecked ? theme.colors.primary.main : 'transparent'
            }]}
            onPress={() => onToggleItem(index)}
          >
            {isChecked && (
              <Text style={[styles.checkmark, { color: theme.colors.primary.contrast }]}>✓</Text>
            )}
          </TouchableOpacity>
          
          <View style={styles.productInfo}>
            <Text style={[styles.productName, { color: theme.colors.text.primary }]}>
              {item.name}
            </Text>
            <Text style={[styles.productDescription, { color: theme.colors.text.secondary }]}>
              {item.type}
            </Text>
            {item.estPriceUSD && (
              <Text style={[styles.productPrice, { color: theme.colors.primary.main }]}>
                ${item.estPriceUSD.toFixed(2)}
              </Text>
            )}
            {item.placement?.note && (
              <Text style={[styles.placementNote, { color: theme.colors.text.secondary }]}>
                {item.placement.note}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.productActions}>
          <View style={[styles.quantityBadge, { backgroundColor: theme.colors.primary.main }]}>
            <Text style={[styles.quantityText, { color: theme.colors.primary.contrast }]}>
              Qty: {quantity}
            </Text>
          </View>

          {item.amazonLink && (
            <TouchableOpacity
              style={[styles.amazonButton, { backgroundColor: theme.colors.primary.main }]}
              onPress={() => handleAmazonPress(item.amazonLink)}
            >
              <LinearGradient
                colors={[theme.colors.primary.main, theme.colors.primary.dark]}
                style={styles.amazonButtonContent}
              >
                <Text style={[styles.amazonButtonText, { color: theme.colors.primary.contrast }]}>
                  View on Amazon
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }, [checkedItems, onToggleItem, theme]);

  if (products.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
          No products available
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={products}
      renderItem={renderProduct}
      keyExtractor={(item, index) => item.name || index.toString()}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContainer}
      nestedScrollEnabled={true}
      scrollEnabled={false}
    />
  );
};

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  productItem: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  productHeader: {
    flexDirection: 'row',
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
  },
  checkmark: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
  },
  placementNote: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  productActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 36,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    marginHorizontal: 8,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
  },
  amazonButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  amazonButtonContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  amazonButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
