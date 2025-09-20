import { useState, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';

interface DesignFormState {
  selectedImage: string | null;
  selectedImageUri: string | null;
  description: string;
  isGenerating: boolean;
  error: string | null;
  isProcessingImage: boolean;
  imageRenderKey: number;
}

interface DesignFormActions {
  setSelectedImage: (image: string | null) => void;
  setSelectedImageUri: (uri: string | null) => void;
  setDescription: (description: string) => void;
  setIsGenerating: (generating: boolean) => void;
  setError: (error: string | null) => void;
  setIsProcessingImage: (processing: boolean) => void;
  handleImageData: (asset: any) => Promise<boolean>;
  validateForm: (step: number) => boolean;
  resetForm: () => void;
  canProceedToNext: (step: number) => boolean;
}

const MAX_DESCRIPTION_LENGTH = 500;

export const useDesignForm = (): DesignFormState & DesignFormActions => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [description, setDescription] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);
  const [imageRenderKey, setImageRenderKey] = useState<number>(0);

  const handleImageData = useCallback(async (asset: any): Promise<boolean> => {
    // Always set the URI for preview first
    if (asset.uri) {
      setSelectedImageUri(asset.uri);
      setImageRenderKey(prev => prev + 1); // Force re-render
    }
    
    if (asset.base64) {
      setSelectedImage(asset.base64);
      setIsProcessingImage(false);
      return true;
    } else if (asset.uri) {
      try {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const reader = new FileReader();
        
        return new Promise((resolve, reject) => {
          reader.onload = () => {
            try {
              const base64 = reader.result as string;
              const cleanBase64 = base64.split(',')[1];
              setSelectedImage(cleanBase64);
              setIsProcessingImage(false);
              resolve(true);
            } catch (error) {
              reject(error);
            }
          };
          reader.onerror = () => {
            reject(new Error('FileReader error'));
          };
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error('Error fetching image:', error);
        throw error;
      }
    } else {
      throw new Error('No image data available');
    }
  }, []);

  const validateForm = useCallback((step: number): boolean => {
    switch (step) {
      case 1:
        if (!selectedImageUri && !selectedImage) {
          setError('Please select an image before proceeding');
          return false;
        }
        break;
      case 2:
        if (!description.trim()) {
          setError('Please describe your design vision before proceeding');
          return false;
        }
        if (description.length > MAX_DESCRIPTION_LENGTH) {
          setError(`Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`);
          return false;
        }
        break;
      case 3:
        if ((!selectedImageUri && !selectedImage) || !description.trim()) {
          setError('Please complete all previous steps before generating');
          return false;
        }
        break;
    }
    setError(null);
    return true;
  }, [selectedImage, selectedImageUri, description]);

  const resetForm = useCallback(() => {
    setSelectedImage(null);
    setSelectedImageUri(null);
    setDescription('');
    setIsGenerating(false);
    setError(null);
    setIsProcessingImage(false);
    setImageRenderKey(0);
  }, []);

  const canProceedToNext = useCallback((step: number) => {
    switch (step) {
      case 1:
        // Allow proceeding if we have either the URI (for display) or the base64 (for processing)
        return selectedImageUri !== null || selectedImage !== null;
      case 2:
        return description.trim().length > 0 && description.length <= MAX_DESCRIPTION_LENGTH;
      case 3:
        return true;
      default:
        return false;
    }
  }, [selectedImage, selectedImageUri, description]);

  return {
    // State
    selectedImage,
    selectedImageUri,
    description,
    isGenerating,
    error,
    isProcessingImage,
    imageRenderKey,
    
    // Actions
    setSelectedImage,
    setSelectedImageUri,
    setDescription,
    setIsGenerating,
    setError,
    setIsProcessingImage,
    handleImageData,
    validateForm,
    resetForm,
    
    // Computed
    canProceedToNext,
  };
};
