import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import { CameraIcon } from './icons/DesignIcons';

const { width } = Dimensions.get('window');

interface ImagePreviewProps {
  imageUri: string | null;
  isProcessing: boolean;
  onRetake: () => void;
  onChangePhoto: () => void;
  theme: any;
  size?: 'large' | 'medium' | 'small';
  showActions?: boolean;
  renderKey?: number;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  imageUri,
  isProcessing,
  onRetake,
  onChangePhoto,
  theme,
  size = 'large',
  showActions = true,
  renderKey = 0,
}) => {
  const getImageSize = () => {
    switch (size) {
      case 'small':
        return { width: 160, height: 160 };
      case 'medium':
        return { width: width - 60, height: 200 };
      case 'large':
      default:
        return { width: width - 60, height: width * 0.8 };
    }
  };

  const imageSize = getImageSize();

  if (isProcessing) {
    return (
      <View style={[styles.processingContainer, { height: imageSize.height }]}>
        <ActivityIndicator size="large" color={theme.colors.primary.main} />
        <Text style={[styles.processingText, { color: theme.colors.text.secondary }]}>
          Processing image...
        </Text>
      </View>
    );
  }

  if (!imageUri) {
    return (
      <View style={[styles.uploadContainer, { height: imageSize.height }]}>
        <View style={[styles.uploadArea, { borderColor: theme.colors.border.light }]}>
          <View style={styles.uploadIconContainer}>
            <CameraIcon size={64} color={theme.colors.text.secondary} />
          </View>
          <Text style={[styles.uploadSubtitle, { color: theme.colors.text.secondary }]}>
            Take a photo or choose from your gallery
          </Text>
        </View>
      </View>
    );
  }


  return (
    <View style={styles.previewContainer}>
      <View style={[styles.imageWrapper, { ...imageSize }]}>
        <Image 
          key={`${imageUri}-${renderKey}`} // Force re-render when URI or renderKey changes
          source={{ uri: imageUri }} 
          style={styles.image}
          fadeDuration={0}
          resizeMode="contain"
          accessibilityLabel="Selected room image"
        />
      </View>
      
      {showActions && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.background.secondary }]}
            onPress={onChangePhoto}
            accessibilityLabel="Change photo"
            accessibilityRole="button"
          >
            <Text style={[styles.actionButtonText, { color: theme.colors.text.primary }]}>
              Change Photo
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonSecondary, { borderColor: theme.colors.primary.main }]}
            onPress={onRetake}
            accessibilityLabel="Retake photo"
            accessibilityRole="button"
          >
            <Text style={[styles.actionButtonText, { color: theme.colors.primary.main }]}>
              Retake
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  previewContainer: {
    alignItems: 'center',
  },
  imageWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 20,
    width: width - 60,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  processingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  processingText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  uploadContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  uploadArea: {
    width: width - 60,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  uploadIconContainer: {
    marginBottom: 24,
  },
  uploadSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 24,
  },
});
