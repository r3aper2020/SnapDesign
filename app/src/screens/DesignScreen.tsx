import React, { useState } from 'react';
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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../theme/ThemeProvider';
import { endpoints } from '../config/api';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

const { width } = Dimensions.get('window');

type DesignScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Design'>;

interface DesignScreenProps {
  navigation: DesignScreenNavigationProp;
}

export const DesignScreen: React.FC<DesignScreenProps> = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('halloween');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].base64 || null);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access your camera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].base64 || null);
    }
  };

  const handleGenerateDesign = async () => {
    if (!selectedImage || !prompt.trim()) {
      Alert.alert('Error', 'Please select an image and enter a prompt');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // First check if server is reachable
      try {
        const healthResponse = await fetch(endpoints.health());
        if (!healthResponse.ok) {
          throw new Error('Server not responding');
        }
      } catch (healthError) {
        throw new Error('Cannot connect to server. Make sure the API server is running on port 4000.');
      }
      
      if (!selectedImage || selectedImage.length < 1000) {
        throw new Error('Please select a valid image first');
      }

      const requestBody = {
        imageBase64: selectedImage,
        theme: prompt.trim(),
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
        navigation.navigate('Result', {
          generatedImage: data.editedImageBase64,
          products: data.products.items || data.products
        });
      } else {
        throw new Error('Invalid response format from server');
      }

    } catch (err: any) {
      setError(err.message || 'Failed to generate design');
    } finally {
      setIsGenerating(false);
    }
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
            Design Studio
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
            Transform any space with AI-powered design and get product recommendations
          </Text>
        </View>

        {/* Image Selection Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.background.secondary }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>
              Upload Your Space
            </Text>
            <Text style={[styles.cardSubtitle, { color: theme.colors.text.secondary }]}>
              Take a photo or choose from your gallery
            </Text>
          </View>
          
          <View style={styles.imageContainer}>
            {selectedImage ? (
              <View style={styles.selectedImageWrapper}>
                <Image 
                  source={{ uri: `data:image/jpeg;base64,${selectedImage}` }} 
                  style={styles.selectedImage} 
                />
                <View style={styles.imageOverlay}>
                  <Text style={[styles.imageOverlayText, { color: theme.colors.primary.contrast }]}>
                    Image Selected
                  </Text>
                </View>
              </View>
            ) : (
              <View style={[styles.placeholderImage, { borderColor: theme.colors.border.light }]}>
                <Text style={[styles.placeholderText, { color: theme.colors.text.secondary }]}>
                  No image selected
                </Text>
                <Text style={[styles.placeholderSubtext, { color: theme.colors.text.secondary }]}>
                  Choose a photo to get started
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.imageButtons}>
            <TouchableOpacity 
              style={[styles.imageButton, { backgroundColor: theme.colors.primary.main }]}
              onPress={pickImage}
            >
              <Text style={[styles.imageButtonText, { color: theme.colors.primary.contrast }]}>
                Choose Photo
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.imageButton, { backgroundColor: theme.colors.secondary.main }]}
              onPress={takePhoto}
            >
              <Text style={[styles.imageButtonText, { color: theme.colors.secondary.contrast }]}>
                Take Photo
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Theme Input Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.background.secondary }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>
              Design Theme
            </Text>
            <Text style={[styles.cardSubtitle, { color: theme.colors.text.secondary }]}>
              Describe the style or theme you want
            </Text>
          </View>
          
          <TextInput
            style={[styles.themeInput, { 
              color: theme.colors.text.primary,
              borderColor: theme.colors.border.light,
              backgroundColor: theme.colors.background.primary,
            }]}
            value={prompt}
            onChangeText={setPrompt}
            placeholder="e.g., 'halloween party', 'christmas cozy', 'modern minimalist', 'tropical paradise'"
            placeholderTextColor={theme.colors.text.secondary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          
          <View style={styles.themeExamples}>
            <Text style={[styles.themeExamplesTitle, { color: theme.colors.text.secondary }]}>
              Popular themes:
            </Text>
            <View style={styles.themeTags}>
              {['halloween', 'christmas', 'birthday', 'modern', 'vintage', 'tropical'].map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.themeTag,
                    { 
                      backgroundColor: prompt === tag ? theme.colors.primary.main : theme.colors.background.primary,
                      borderColor: theme.colors.border.light
                    }
                  ]}
                  onPress={() => setPrompt(tag)}
                >
                  <Text style={[
                    styles.themeTagText,
                    { 
                      color: prompt === tag ? theme.colors.primary.contrast : theme.colors.text.secondary 
                    }
                  ]}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Generate Button */}
        <TouchableOpacity
          style={[
            styles.generateButton,
            { 
              backgroundColor: selectedImage ? theme.colors.primary.main : '#CCCCCC',
              opacity: selectedImage ? 1 : 0.6,
            }
          ]}
          onPress={handleGenerateDesign}
          disabled={!selectedImage || isGenerating}
        >
          {isGenerating ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={theme.colors.primary.contrast} size="small" />
              <Text style={[styles.loadingText, { color: theme.colors.primary.contrast }]}>
                Creating your design...
              </Text>
            </View>
          ) : (
            <View style={styles.generateButtonContent}>
              <Text style={[styles.generateButtonText, { color: theme.colors.primary.contrast }]}>
                Generate Design
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Error Display */}
        {error && (
          <View style={[styles.errorCard, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
            <Text style={[styles.errorText, { color: '#DC2626' }]}>{error}</Text>
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
  selectedImageWrapper: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  selectedImage: {
    width: width - 96,
    height: ((width - 96) * 3) / 4,
    borderRadius: 12,
  },
  imageOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  imageOverlayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  placeholderImage: {
    width: width - 96,
    height: ((width - 96) * 3) / 4,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  imageButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  imageButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  themeInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    marginBottom: 20,
  },
  themeExamples: {
    marginTop: 8,
  },
  themeExamplesTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  themeTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  themeTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  themeTagText: {
    fontSize: 14,
    fontWeight: '500',
  },
  generateButton: {
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  generateButtonContent: {
    alignItems: 'center',
  },
  generateButtonText: {
    fontSize: 18,
    fontWeight: '700',
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
  errorCard: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
