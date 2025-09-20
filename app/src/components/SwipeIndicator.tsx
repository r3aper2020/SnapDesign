import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';

interface SwipeIndicatorProps {
  direction: 'left' | 'right';
  onPress: () => void;
  theme: any;
  animatedValue?: Animated.Value;
  visible?: boolean;
}

export const SwipeIndicator: React.FC<SwipeIndicatorProps> = ({
  direction,
  onPress,
  theme,
  animatedValue,
  visible = true,
}) => {
  if (!visible) return null;

  const isLeft = direction === 'left';
  const ArrowComponent = animatedValue ? Animated.View : View;

  return (
    <View style={[styles.container, { [isLeft ? 'left' : 'right']: 20 }]}>
      <View style={styles.content}>
        <ArrowComponent 
          style={[
            styles.arrow,
            {
              backgroundColor: isLeft 
                ? theme.colors.background.secondary 
                : theme.colors.primary.main,
              opacity: animatedValue || 1,
            }
          ]}
        >
          <View style={[
            styles.arrowShape,
            {
              borderLeftWidth: isLeft ? 0 : 8,
              borderRightWidth: isLeft ? 8 : 0,
              borderLeftColor: isLeft ? 'transparent' : 'white',
              borderRightColor: isLeft ? theme.colors.text.secondary : 'transparent',
            }
          ]} />
        </ArrowComponent>
        <Text style={[styles.hint, { color: theme.colors.text.secondary }]}>
          {isLeft ? 'Back' : 'Next'}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.touchable}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityLabel={`${direction} navigation`}
        accessibilityRole="button"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 300, // Fixed position from top
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
  },
  content: {
    alignItems: 'center',
    gap: 8,
  },
  arrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  arrowShape: {
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  hint: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.8,
  },
  touchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 11,
  },
});
