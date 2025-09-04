import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

const { width } = Dimensions.get('window');

type SearchScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Search'>;

interface SearchScreenProps {
  navigation: SearchScreenNavigationProp;
  route: {
    params: {
      keywords: string[];
    };
  };
}

export const SearchScreen: React.FC<SearchScreenProps> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { keywords } = route.params;
  const [searchQuery, setSearchQuery] = useState(keywords.join(' '));

  const handleSearch = () => {
    if (searchQuery.trim()) {
      const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(searchQuery.trim())}&tag=snapdesign-20`;
      // In a real app, you'd open this URL or navigate to a search results screen
      console.log('Searching for:', searchQuery.trim());
    }
  };

  const handleBackToDesign = () => {
    navigation.navigate('Design');
  };

  const popularSearches = [
    'halloween decorations',
    'christmas lights',
    'modern furniture',
    'vintage accessories',
    'tropical plants',
    'minimalist decor',
    'bohemian style',
    'industrial design',
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={[styles.title, { color: theme.colors.text.primary }]}>
            Product Search
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
            Find the perfect products to complete your design
          </Text>
        </View>

        {/* Search Input Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.background.secondary }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>
              Search Products
            </Text>
            <Text style={[styles.cardSubtitle, { color: theme.colors.text.secondary }]}>
              Enter keywords to find specific items
            </Text>
          </View>
          
          <TextInput
            style={[styles.searchInput, { 
              color: theme.colors.text.primary,
              borderColor: theme.colors.border.light,
              backgroundColor: theme.colors.background.primary,
            }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="e.g., 'halloween spiderweb', 'christmas lights', 'modern sofa'"
            placeholderTextColor={theme.colors.text.secondary}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
          
          <TouchableOpacity
            style={[styles.searchButton, { backgroundColor: theme.colors.primary.main }]}
            onPress={handleSearch}
          >
            <Text style={[styles.searchButtonText, { color: theme.colors.primary.contrast }]}>
              Search Amazon
            </Text>
          </TouchableOpacity>
        </View>

        {/* Popular Searches Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.background.secondary }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>
              Popular Searches
            </Text>
            <Text style={[styles.cardSubtitle, { color: theme.colors.text.secondary }]}>
              Quick access to trending searches
            </Text>
          </View>
          
          <View style={styles.popularSearches}>
            {popularSearches.map((search, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.searchTag,
                  { 
                    backgroundColor: searchQuery === search ? theme.colors.primary.main : theme.colors.background.primary,
                    borderColor: theme.colors.border.light
                  }
                ]}
                onPress={() => setSearchQuery(search)}
              >
                <Text style={[
                  styles.searchTagText,
                  { 
                    color: searchQuery === search ? theme.colors.primary.contrast : theme.colors.text.secondary 
                  }
                ]}>
                  {search}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Actions Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.background.secondary }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>
              Quick Actions
            </Text>
            <Text style={[styles.cardSubtitle, { color: theme.colors.text.secondary }]}>
              Jump back to creating designs
            </Text>
          </View>
          
          <TouchableOpacity
            style={[styles.quickActionButton, { backgroundColor: theme.colors.primary.main }]}
            onPress={handleBackToDesign}
          >
            <Text style={[styles.quickActionText, { color: theme.colors.primary.contrast }]}>
              Create New Design
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info Section */}
        <View style={[styles.infoCard, { backgroundColor: theme.colors.background.secondary }]}>
          <Text style={[styles.infoTitle, { color: theme.colors.text.primary }]}>
            Search Tips
          </Text>
          <Text style={[styles.infoText, { color: theme.colors.text.secondary }]}>
            • Use specific keywords for better results{'\n'}
            • Include color, style, or brand names{'\n'}
            • Try different variations of your search{'\n'}
            • All searches open Amazon with affiliate links
          </Text>
        </View>
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
    paddingTop: 40,
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
  searchInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 80,
    marginBottom: 20,
  },
  searchButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  popularSearches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  searchTag: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  searchTagText: {
    fontSize: 14,
    fontWeight: '500',
  },
  quickActionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  quickActionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.8,
  },
});
