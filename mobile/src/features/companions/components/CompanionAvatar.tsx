/**
 * LifeBuddy Companion Avatar Component
 * Native React Native implementation of LifeAdmin's original virtual companions.
 * Uses soft 3D clay aesthetic with radial-like ambient halo, shadow depth,
 * and elemental icons.
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { getCompanionById } from '../catalog';
import { Radius } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { ThemedText } from '@/components/themed-text';

export interface CompanionAvatarProps {
  id: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
  style?: ViewStyle;
}

const SIZE_CONFIGS = {
  sm: {
    containerSize: 46,
    bodySize: 36,
    iconSize: 18,
    borderWidth: 2,
    badgeBottom: -4,
  },
  md: {
    containerSize: 68,
    bodySize: 54,
    iconSize: 26,
    borderWidth: 2.5,
  },
  lg: {
    containerSize: 96,
    bodySize: 76,
    iconSize: 36,
    borderWidth: 3,
  },
  xl: {
    containerSize: 128,
    bodySize: 104,
    iconSize: 50,
    borderWidth: 3.5,
  },
};

export function CompanionAvatar({
  id,
  size = 'md',
  showBadge = false,
  style,
}: CompanionAvatarProps) {
  const companion = getCompanionById(id);
  const cfg = SIZE_CONFIGS[size];

  return (
    <View
      style={[
        styles.outerContainer,
        {
          width: cfg.containerSize,
          height: cfg.containerSize,
        },
        style,
      ]}
    >
      {/* Outer Glow Halo */}
      <View
        style={[
          styles.glowHalo,
          {
            backgroundColor: companion.colorScheme.glow,
            width: cfg.containerSize,
            height: cfg.containerSize,
            borderRadius: cfg.containerSize / 2,
          },
        ]}
      />

      {/* 3D Clay Body Orb */}
      <View
        style={[
          styles.bodyOrb,
          {
            width: cfg.bodySize,
            height: cfg.bodySize,
            borderRadius: cfg.bodySize / 2,
            backgroundColor: companion.colorScheme.primary,
            borderColor: companion.colorScheme.secondary,
            borderWidth: cfg.borderWidth,
            shadowColor: companion.colorScheme.primary,
          },
        ]}
      >
        {/* Specular Highlight Gleam */}
        <View
          style={[
            styles.specularGleam,
            {
              width: cfg.bodySize * 0.35,
              height: cfg.bodySize * 0.22,
              borderRadius: cfg.bodySize * 0.15,
            },
          ]}
        />

        {/* Companion Expressive Icon */}
        <SymbolView
          name={companion.iconName as any}
          size={cfg.iconSize}
          tintColor="#FFFFFF"
        />
      </View>

      {/* Optional Element Badge */}
      {showBadge && (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: companion.colorScheme.accent,
            },
          ]}
        >
          <ThemedText style={styles.badgeText}>{companion.element}</ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glowHalo: {
    position: 'absolute',
    opacity: 0.85,
    transform: [{ scale: 1.05 }],
  },
  bodyOrb: {
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  specularGleam: {
    position: 'absolute',
    top: '12%',
    left: '18%',
    backgroundColor: '#FFFFFF',
    opacity: 0.45,
    transform: [{ rotate: '-28deg' }],
  },
  badge: {
    position: 'absolute',
    bottom: -6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: Typography.fontFamilies.sansBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

