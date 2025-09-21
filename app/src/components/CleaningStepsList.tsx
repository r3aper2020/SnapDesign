import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================
interface CleaningStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  estimatedTime?: string;
}

interface CleaningStepsListProps {
  cleaningSteps: CleaningStep[];
  checkedItems: Set<number>;
  onToggleItem: (index: number) => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const CleaningStepsList: React.FC<CleaningStepsListProps> = ({
  cleaningSteps,
  checkedItems,
  onToggleItem,
}) => {
  const { theme } = useTheme();

  const renderCleaningStep = useCallback(({ item, index }: { item: CleaningStep; index: number }) => {
    const isChecked = checkedItems.has(index);

    return (
      <View style={[styles.stepItem, { 
        backgroundColor: theme.colors.background.secondary,
        borderColor: theme.colors.border.light 
      }]}>
        <View style={styles.stepHeader}>
          <TouchableOpacity
            style={[styles.checkbox, { 
              borderColor: theme.colors.button.success,
              backgroundColor: isChecked ? theme.colors.button.success : 'transparent'
            }]}
            onPress={() => onToggleItem(index)}
          >
            {isChecked && (
              <MaterialIcons 
                name="check" 
                size={16} 
                color={theme.colors.primary.contrast}
              />
            )}
          </TouchableOpacity>
          
          <View style={styles.stepInfo}>
            <Text style={[styles.stepTitle, { color: theme.colors.text.primary }]}>
              {item.title}
            </Text>
            <Text style={[styles.stepDescription, { color: theme.colors.text.secondary }]}>
              {item.description}
            </Text>
            {item.estimatedTime && (
              <View style={styles.stepTimeContainer}>
                <MaterialIcons name="schedule" size={16} color={theme.colors.button.warning} />
                <Text style={[styles.stepTime, { color: theme.colors.button.warning }]}>
                  {item.estimatedTime}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }, [checkedItems, onToggleItem, theme]);

  if (cleaningSteps.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
          No cleaning steps available
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={cleaningSteps}
      renderItem={renderCleaningStep}
      keyExtractor={(item, index) => item.id || index.toString()}
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
  stepItem: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  stepHeader: {
    flexDirection: 'row',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepInfo: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  stepTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  stepTime: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
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
