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
  FlatList,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { designStorage, SavedDesign } from '../services/DesignStorage';

const { width } = Dimensions.get('window');

type SavedDesignsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SavedDesigns'>;

// Skeleton Loading Component
const DesignCardSkeleton: React.FC<{ theme: any }> = ({ theme }) => (
  <View style={[styles.designCard, { backgroundColor: theme.colors.background.secondary }]}>
    <View style={[styles.skeletonImage, { backgroundColor: theme.colors.background.primary }]} />
    <View style={styles.designInfo}>
      <View style={[styles.skeletonText, { backgroundColor: theme.colors.background.primary }]} />
      <View style={[styles.skeletonTextSmall, { backgroundColor: theme.colors.background.primary }]} />
      <View style={[styles.skeletonTextSmall, { backgroundColor: theme.colors.background.primary }]} />
    </View>
    <View style={styles.actionsContainer}>
      <View style={[styles.skeletonButton, { backgroundColor: theme.colors.background.primary }]} />
      <View style={[styles.skeletonButton, { backgroundColor: theme.colors.background.primary }]} />
    </View>
  </View>
);

// Design Card Component for lazy loading
const DesignCard: React.FC<{
  design: SavedDesign;
  theme: any;
  onViewDesign: (design: SavedDesign) => void;
  onDeleteDesign: (design: SavedDesign) => void;
}> = ({ design, theme, onViewDesign, onDeleteDesign }) => {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <View style={[styles.designCard, { backgroundColor: theme.colors.background.secondary }]}>
      {/* Design Image */}
      <TouchableOpacity 
        style={styles.imageContainer}
        onPress={() => onViewDesign(design)}
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
        <View style={styles.designHeader}>
          <Text style={[styles.designType, { color: theme.colors.primary.main }]}>
            {design.serviceType === 'declutter' ? '🧹 Decluttering Plan' : 
             design.serviceType === 'makeover' ? '🏠 Room Makeover' : 
             '🎨 AI Design'}
          </Text>
        </View>
        <Text style={[styles.designDescription, { color: theme.colors.text.primary }]} numberOfLines={2}>
          {design.description}
        </Text>
        <Text style={[styles.designDate, { color: theme.colors.text.secondary }]}>
          {formatDate(design.timestamp)}
        </Text>
        <Text style={[styles.designProducts, { color: theme.colors.text.secondary }]}>
          {design.serviceType === 'declutter' 
            ? `${design.cleaningSteps?.length || 0} cleaning step${(design.cleaningSteps?.length || 0) !== 1 ? 's' : ''}`
            : design.serviceType === 'makeover'
            ? 'Complete makeover plan'
            : `${design.products?.length || 0} product${(design.products?.length || 0) !== 1 ? 's' : ''}`
          }
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.colors.secondary.main }]}
          onPress={() => onViewDesign(design)}
        >
          <Text style={[styles.actionButtonText, { color: theme.colors.secondary.contrast }]}>
            View
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton, { borderColor: theme.colors.text.secondary }]}
          onPress={() => onDeleteDesign(design)}
        >
          <Text style={[styles.deleteButtonText, { color: theme.colors.text.secondary }]}>
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

interface SavedDesignsScreenProps {
  navigation: SavedDesignsScreenNavigationProp;
}

type FilterType = 'all' | 'design' | 'declutter' | 'makeover';

export const SavedDesignsScreen: React.FC<SavedDesignsScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const [savedDesigns, setSavedDesigns] = useState<SavedDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  
  const ITEMS_PER_PAGE = 6; // Smaller initial load for faster response

  // Filter designs based on active filter
  const filterDesigns = useCallback((designs: SavedDesign[], filter: FilterType): SavedDesign[] => {
    if (filter === 'all') return designs;
    return designs.filter(design => design.serviceType === filter);
  }, []);

  const loadDesigns = useCallback(async (reset: boolean = false) => {
    try {
      const offset = reset ? 0 : savedDesigns.length;
      const result = await designStorage.getSavedDesignsPaginated(ITEMS_PER_PAGE, offset);
      
      // Apply filter to the loaded designs
      const filteredDesigns = filterDesigns(result.designs, activeFilter);
      
      if (reset) {
        setSavedDesigns(filteredDesigns);
      } else {
        setSavedDesigns(prev => [...prev, ...filteredDesigns]);
      }
      
      setHasMore(result.hasMore);
      setTotal(result.total);
    } catch (error) {
      console.error('Error loading designs:', error);
      Alert.alert('Error', 'Failed to load saved designs');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [savedDesigns.length, activeFilter, filterDesigns]);

  useEffect(() => {
    loadDesigns(true);
  }, []);

  // Reload designs when filter changes
  useEffect(() => {
    loadDesigns(true);
  }, [activeFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setHasMore(true);
    loadDesigns(true);
  }, [loadDesigns]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      loadDesigns(false);
    }
  }, [loadingMore, hasMore, loadDesigns]);

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
    if (design.serviceType === 'declutter') {
      navigation.navigate('DeclutterResult', {
        generatedImage: design.generatedImage,
        originalImage: design.originalImage,
        cleaningSteps: design.cleaningSteps || [],
        description: design.description,
      });
    } else {
      navigation.navigate('Result', {
        generatedImage: design.generatedImage,
        originalImage: design.originalImage,
        products: design.products || [],
        designId: design.id,
        description: design.description,
      });
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Remove the full-screen loading state - show UI immediately

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
        <View style={styles.headerContent}>
          <Image 
            source={require('../../assets/re-vibe.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.title, { color: theme.colors.text.primary }]}>
            Saved Projects
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
            {loading ? 'Loading projects...' : total > 0 ? `${savedDesigns.length} of ${total} projects` : 'No projects saved'}
          </Text>
        </View>
      </View>
      
      {/* Filter Tabs */}
      <View style={styles.filterTabsContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterTabsContent}
        >
          {[
            { key: 'all', label: 'All', icon: '📁' },
            { key: 'design', label: 'Designs', icon: '🎨' },
            { key: 'declutter', label: 'Plans', icon: '🧹' },
            { key: 'makeover', label: 'Makeover', icon: '🏠' },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterTab,
                { 
                  backgroundColor: activeFilter === filter.key 
                    ? theme.colors.primary.main 
                    : 'rgba(255, 255, 255, 0.1)',
                  borderColor: activeFilter === filter.key 
                    ? theme.colors.primary.main 
                    : 'rgba(255, 255, 255, 0.2)',
                }
              ]}
              onPress={() => setActiveFilter(filter.key as FilterType)}
              activeOpacity={0.7}
            >
              <Text style={styles.filterTabIcon}>{filter.icon}</Text>
              <Text style={[
                styles.filterTabText,
                { 
                  color: activeFilter === filter.key 
                    ? '#FFFFFF' 
                    : theme.colors.text.secondary 
                }
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      <FlatList
        data={loading && savedDesigns.length === 0 ? Array(6).fill(null) : savedDesigns}
        keyExtractor={(item, index) => item?.id || `skeleton-${index}`}
        numColumns={2}
        contentContainerStyle={styles.scrollContent}
        columnWrapperStyle={styles.row}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item: design, index }) => 
          loading && !design ? (
            <DesignCardSkeleton key={`skeleton-${index}`} theme={theme} />
          ) : (
            <DesignCard
              design={design}
              theme={theme}
              onViewDesign={handleViewDesign}
              onDeleteDesign={(design) => handleDeleteDesign(design.id)}
            />
          )
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>
                No Saved Projects
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.text.secondary }]}>
                Create your first design or decluttering plan to see it saved here
              </Text>
              <TouchableOpacity
                style={[styles.createButton, { backgroundColor: theme.colors.accent.purple }]}
                onPress={() => navigation.navigate('MainTabs', { screen: 'Design' })}
              >
                <Text style={[styles.createButtonText, { color: theme.colors.text.primary }]}>
                  Create Design
                </Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingMoreContainer}>
              <Text style={[styles.loadingMoreText, { color: theme.colors.text.secondary }]}>
                Loading more designs...
              </Text>
            </View>
          ) : hasMore && savedDesigns.length > 0 ? (
            <View style={styles.loadMoreContainer}>
              <TouchableOpacity
                style={[styles.loadMoreButton, { backgroundColor: theme.colors.background.secondary }]}
                onPress={loadMore}
              >
                <Text style={[styles.loadMoreText, { color: theme.colors.text.primary }]}>
                  Load More
                </Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        initialNumToRender={6}
        maxToRenderPerBatch={4}
        windowSize={10}
        removeClippedSubviews={true}
        getItemLayout={(data, index) => ({
          length: 280, // Approximate height of each card
          offset: 280 * Math.floor(index / 2),
          index,
        })}
      />
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
    paddingBottom: 40,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
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
    opacity: 0.8,
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
  designHeader: {
    marginBottom: 6,
  },
  designType: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  // Loading More Styles
  loadingMoreContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingMoreText: {
    fontSize: 14,
    opacity: 0.7,
  },
  loadMoreContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadMoreButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Skeleton Loading Styles
  skeletonImage: {
    height: 120,
    borderRadius: 8,
    opacity: 0.3,
  },
  skeletonText: {
    height: 16,
    borderRadius: 4,
    marginBottom: 8,
    opacity: 0.3,
  },
  skeletonTextSmall: {
    height: 12,
    borderRadius: 4,
    marginBottom: 4,
    width: '60%',
    opacity: 0.3,
  },
  skeletonButton: {
    height: 32,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    opacity: 0.3,
  },
  // Filter Tabs Styles
  filterTabsContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  filterTabsContent: {
    paddingHorizontal: 4,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 12,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 80,
    justifyContent: 'center',
  },
  filterTabIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
