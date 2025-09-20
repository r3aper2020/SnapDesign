import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckIcon } from './icons/DesignIcons';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  theme: any;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ 
  currentStep, 
  totalSteps, 
  theme 
}) => {
  return (
    <View style={styles.container}>
      {Array.from({ length: totalSteps }, (_, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;
        
        return (
          <View key={stepNumber} style={styles.stepItem}>
            <View style={[
              styles.stepCircle,
              {
                backgroundColor: isCompleted 
                  ? theme.colors.primary.main 
                  : isActive 
                    ? theme.colors.primary.main 
                    : 'rgba(255, 255, 255, 0.2)',
                borderColor: isActive ? theme.colors.primary.main : 'rgba(255, 255, 255, 0.3)',
              }
            ]}>
              {isCompleted ? (
                <CheckIcon size={16} color={theme.colors.primary.contrast} />
              ) : (
                <Text style={[
                  styles.stepText,
                  { color: isActive ? theme.colors.primary.contrast : theme.colors.text.secondary }
                ]}>
                  {stepNumber}
                </Text>
              )}
            </View>
            {index < totalSteps - 1 && (
              <View style={[
                styles.stepLine,
                {
                  backgroundColor: stepNumber < currentStep 
                    ? theme.colors.primary.main 
                    : 'rgba(255, 255, 255, 0.2)'
                }
              ]} />
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepText: {
    fontSize: 16,
    fontWeight: '600',
  },
  stepLine: {
    width: 40,
    height: 2,
    marginHorizontal: 8,
  },
});
