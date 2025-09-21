import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface ErrorDisplayProps {
  error: string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  theme: any;
  type?: 'error' | 'warning' | 'info';
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  theme,
  type = 'error',
}) => {
  if (!error) return null;

  const getErrorColor = () => {
    switch (type) {
      case 'warning':
        return theme.colors.warning?.main || '#FFA500';
      case 'info':
        return theme.colors.info?.main || '#007AFF';
      case 'error':
      default:
        return theme.colors.error.main;
    }
  };

  const errorColor = getErrorColor();

  return (
    <View style={[styles.container, { backgroundColor: errorColor + '20' }]}>
      <View style={styles.content}>
        <Text style={[styles.errorText, { color: errorColor }]}>
          {error}
        </Text>
        {(onRetry || onDismiss) && (
          <View style={styles.actions}>
            {onRetry && (
              <TouchableOpacity
                style={[styles.actionButton, { borderColor: errorColor }]}
                onPress={onRetry}
                accessibilityLabel="Retry action"
                accessibilityRole="button"
              >
                <Text style={[styles.actionButtonText, { color: errorColor }]}>
                  Retry
                </Text>
              </TouchableOpacity>
            )}
            {onDismiss && (
              <TouchableOpacity
                style={styles.dismissButton}
                onPress={onDismiss}
                accessibilityLabel="Dismiss error"
                accessibilityRole="button"
              >
                <MaterialIcons 
                  name="close" 
                  size={20} 
                  color={theme.colors.text.secondary}
                />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    marginHorizontal: 24,
    marginBottom: 16,
  },
  content: {
    padding: 16,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dismissButton: {
    padding: 8,
  },
  dismissButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
