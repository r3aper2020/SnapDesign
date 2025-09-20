import React from 'react';
import { View, StyleSheet } from 'react-native';

interface IconProps {
  size?: number;
  color?: string;
}

export const CameraIcon: React.FC<IconProps> = ({ size = 24, color = '#666' }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <View style={[
      styles.cameraBody,
      {
        width: size * 0.8,
        height: size * 0.6,
        borderColor: color,
        borderRadius: size * 0.1,
      }
    ]}>
      <View style={[
        styles.cameraFlash,
        {
          top: -size * 0.15,
          right: -size * 0.1,
          width: size * 0.3,
          height: size * 0.2,
          borderColor: color,
          borderRadius: size * 0.05,
        }
      ]} />
      <View style={[
        styles.cameraLens,
        {
          top: size * 0.15,
          left: size * 0.2,
          width: size * 0.15,
          height: size * 0.15,
          borderRadius: size * 0.075,
          backgroundColor: color,
        }
      ]} />
    </View>
  </View>
);

export const SparkleIcon: React.FC<IconProps> = ({ size = 24, color = '#666' }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <View style={[
      styles.sparkleCenter,
      {
        width: size * 0.3,
        height: size * 0.3,
        borderRadius: size * 0.15,
        backgroundColor: color,
      }
    ]} />
    <View style={[
      styles.sparkleLine,
      {
        width: size * 0.6,
        height: 2,
        backgroundColor: color,
        transform: [{ rotate: '45deg' }],
      }
    ]} />
    <View style={[
      styles.sparkleLine,
      {
        width: size * 0.6,
        height: 2,
        backgroundColor: color,
        transform: [{ rotate: '-45deg' }],
      }
    ]} />
  </View>
);

export const LightbulbIcon: React.FC<IconProps> = ({ size = 24, color = '#666' }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <View style={[
      styles.bulbBody,
      {
        width: size * 0.5,
        height: size * 0.5,
        borderRadius: size * 0.25,
        backgroundColor: color,
        top: size * 0.1,
      }
    ]} />
    <View style={[
      styles.bulbBase,
      {
        width: size * 0.3,
        height: size * 0.2,
        borderRadius: size * 0.05,
        backgroundColor: color,
        bottom: size * 0.1,
      }
    ]} />
    <View style={[
      styles.bulbThread,
      {
        width: size * 0.4,
        height: 2,
        backgroundColor: color,
        top: size * 0.3,
        transform: [{ rotate: '45deg' }],
      }
    ]} />
    <View style={[
      styles.bulbThread,
      {
        width: size * 0.4,
        height: 2,
        backgroundColor: color,
        top: size * 0.3,
        transform: [{ rotate: '-45deg' }],
      }
    ]} />
  </View>
);

export const ArrowRightIcon: React.FC<IconProps> = ({ size = 24, color = '#666' }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <View style={[
      styles.arrowShaft,
      {
        width: size * 0.6,
        height: 2,
        backgroundColor: color,
      }
    ]} />
    <View style={[
      styles.arrowHead,
      {
        width: size * 0.3,
        height: 2,
        backgroundColor: color,
        right: 0,
        top: size * 0.2,
        transform: [{ rotate: '45deg' }],
      }
    ]} />
    <View style={[
      styles.arrowHead,
      {
        width: size * 0.3,
        height: 2,
        backgroundColor: color,
        right: 0,
        bottom: size * 0.2,
        transform: [{ rotate: '-45deg' }],
      }
    ]} />
  </View>
);

export const CheckIcon: React.FC<IconProps> = ({ size = 24, color = '#666' }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <View style={[
      styles.checkLine1,
      {
        width: size * 0.4,
        height: 2,
        backgroundColor: color,
        left: size * 0.2,
        top: size * 0.4,
        transform: [{ rotate: '45deg' }],
      }
    ]} />
    <View style={[
      styles.checkLine2,
      {
        width: size * 0.6,
        height: 2,
        backgroundColor: color,
        left: size * 0.1,
        top: size * 0.5,
        transform: [{ rotate: '-45deg' }],
      }
    ]} />
  </View>
);

const styles = StyleSheet.create({
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBody: {
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  cameraFlash: {
    position: 'absolute',
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  cameraLens: {
    position: 'absolute',
  },
  sparkleCenter: {
    position: 'absolute',
  },
  sparkleLine: {
    position: 'absolute',
  },
  bulbBody: {
    position: 'absolute',
  },
  bulbBase: {
    position: 'absolute',
  },
  bulbThread: {
    position: 'absolute',
  },
  arrowShaft: {
    position: 'absolute',
  },
  arrowHead: {
    position: 'absolute',
  },
  checkLine1: {
    position: 'absolute',
  },
  checkLine2: {
    position: 'absolute',
  },
});
