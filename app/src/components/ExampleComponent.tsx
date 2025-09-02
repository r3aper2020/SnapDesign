import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme';

interface ExampleComponentProps {
  title: string;
  description?: string;
}

export const ExampleComponent: React.FC<ExampleComponentProps> = ({ 
  title, 
  description 
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { 
      backgroundColor: theme.colors.background.primary,
      borderColor: theme.colors.border.light,
      ...theme.shadows.sm
    }]}>
      <Text style={[styles.title, { color: theme.colors.text.primary }]}>
        {title}
      </Text>
      {description && (
        <Text style={[styles.description, { color: theme.colors.text.secondary }]}>
          {description}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
});
