import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Dimensions,
  Alert,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { designStorage, SavedDesign } from '../services/DesignStorage';

const { width } = Dimensions.get('window');

type SavedDesignsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SavedDesigns'>;

interface SavedDesignsScreenProps {
  navigation: SavedDesignsScreenNavigationProp;
}

export const SavedDesignsScreen: React.FC<SavedDesignsScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const [savedDesigns, setSavedDesigns] = useState<SavedDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDesigns = useCallback(async () => {
    try {
      const designs = await designStorage.getSavedDesigns();
      setSavedDesigns(designs);
    } catch (error) {
      console.error('Error loading designs:', error);
      Alert.alert('Error', 'Failed to load saved designs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDesigns();
  }, [loadDesigns]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDesigns();
  }, [loadDesigns]);

  const handleDeleteDesign = (designId: string) => {
    Alert.alert(
      'Delete Design',
      'Are you sure you want to delete this design?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await designStorage.deleteDesign(designId);
              setSavedDesigns(prev => prev.filter(design => design.id !== designId));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete design');
            }
          },
        },
      ]
    );
  };

  const handleViewDesign = (design: SavedDesign) => {
    navigation.navigate('Result', {
      generatedImage: design.generatedImage,
      originalImage: design.originalImage,
      products: design.products,
      designId: design.id,
    });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
            Loading saved designs...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={[styles.title, { color: theme.colors.text.primary }]}>
            Saved Designs
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
            {savedDesigns.length} design{savedDesigns.length !== 1 ? 's' : ''} saved
          </Text>
        </View>

        {/* Designs Grid */}
        {savedDesigns.length > 0 ? (
          <View style={styles.designsGrid}>
            {savedDesigns.map((design) => (
              <View key={design.id} style={[styles.designCard, { backgroundColor: theme.colors.background.secondary }]}>
                {/* Design Image */}
                <TouchableOpacity 
                  style={styles.imageContainer}
                  onPress={() => handleViewDesign(design)}
                >
                  <Image 
                    source={{ uri: `data:image/jpeg;base64,${design.generatedImage}` }} 
                    style={styles.designImage} 
                    resizeMode="cover"
                  />
                  <View style={styles.imageOverlay}>
                    <Text style={styles.viewText}>View</Text>
                  </View>
                </TouchableOpacity>

                {/* Design Info */}
                <View style={styles.designInfo}>
                  <Text style={[styles.designDescription, { color: theme.colors.text.primary }]} numberOfLines={2}>
                    {design.description}
                  </Text>
                  <Text style={[styles.designDate, { color: theme.colors.text.secondary }]}>
                    {formatDate(design.timestamp)}
                  </Text>
                  <Text style={[styles.designProducts, { color: theme.colors.text.secondary }]}>
                    {design.products.length} item{design.products.length !== 1 ? 's' : ''}
                  </Text>
                </View>

                {/* Actions */}
                <View style={styles.actionsContainer}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.colors.primary.main }]}
                    onPress={() => handleViewDesign(design)}
                  >
                    <Text style={[styles.actionButtonText, { color: theme.colors.primary.contrast }]}>
                      View
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton, { borderColor: theme.colors.text.secondary }]}
                    onPress={() => handleDeleteDesign(design.id)}
                  >
                    <Text style={[styles.deleteButtonText, { color: theme.colors.text.secondary }]}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>
              No Saved Designs
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.text.secondary }]}>
              Create your first design to see it saved here
            </Text>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: theme.colors.primary.main }]}
              onPress={() => navigation.navigate('Design')}
            >
              <Text style={[styles.createButtonText, { color: theme.colors.primary.contrast }]}>
                Create Design
              </Text>
            </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
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
    opacity: 0.8,
  },
  designsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  designCard: {
    width: (width - 48) / 2,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    height: 120,
  },
  designImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  designInfo: {
    padding: 12,
  },
  designDescription: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 18,
  },
  designDate: {
    fontSize: 12,
    marginBottom: 2,
  },
  designProducts: {
    fontSize: 12,
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 12,
    paddingTop: 0,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
    lineHeight: 22,
  },
  createButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
