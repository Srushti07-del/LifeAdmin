import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useState, useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useAppTheme } from '@/context/ThemeContext';

const INITIAL_SCALE_FACTOR = Dimensions.get('screen').height / 90;
const DURATION = 600;

export interface AnimatedSplashOverlayProps {
  isReady?: boolean;
}

export function AnimatedSplashOverlay({ isReady = true }: AnimatedSplashOverlayProps = {}) {
  const { colors, isDark } = useAppTheme();
  const [animate, setAnimate] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (isReady && visible && !animate) {
      SplashScreen.hideAsync()
        .catch(() => {})
        .finally(() => {
          setAnimate(true);
        });
    }
  }, [isReady, visible, animate]);

  if (!visible) return null;

  const splashKeyframe = new Keyframe({
    0: {
      transform: [{ scale: 1 }],
      opacity: 1,
    },
    20: {
      opacity: 1,
    },
    70: {
      opacity: 0,
      easing: Easing.elastic(0.7),
    },
    100: {
      opacity: 0,
      transform: [{ scale: 1 }],
      easing: Easing.elastic(0.7),
    },
  });

  const overlayStyle = [styles.splashOverlay, { backgroundColor: colors.background }];
  const image = (
    <Image
      style={styles.image}
      source={
        isDark
          ? require('@/assets/images/splash-icon-dark.png')
          : require('@/assets/images/splash-icon.png')
      }
      contentFit="contain"
    />
  );

  return animate ? (
    <Animated.View
      entering={splashKeyframe.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) {
          scheduleOnRN(setVisible, false);
        }
      })}
      style={overlayStyle}>
      {image}
    </Animated.View>
  ) : (
    <View style={overlayStyle}>
      {image}
    </View>
  );
}

const keyframe = new Keyframe({
  0: {
    transform: [{ scale: INITIAL_SCALE_FACTOR }],
  },
  100: {
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7),
  },
});

const logoKeyframe = new Keyframe({
  0: {
    transform: [{ scale: 1.3 }],
    opacity: 0,
  },
  40: {
    transform: [{ scale: 1.3 }],
    opacity: 0,
    easing: Easing.elastic(0.7),
  },
  100: {
    opacity: 1,
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7),
  },
});

export function AnimatedIcon() {
  const { colors, isDark } = useAppTheme();

  return (
    <View style={styles.iconContainer}>
      <Animated.View
        entering={keyframe.duration(DURATION)}
        style={[styles.background, { backgroundColor: colors.primarySoft }]}
      />
      <Animated.View style={styles.imageContainer} entering={logoKeyframe.duration(DURATION)}>
        <Image
          style={styles.image}
          source={
            isDark
              ? require('@/assets/images/splash-icon-dark.png')
              : require('@/assets/images/splash-icon.png')
          }
          contentFit="contain"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 128,
    height: 128,
    zIndex: 100,
  },
  image: {
    width: 88,
    height: 88,
  },
  background: {
    borderRadius: 28,
    width: 112,
    height: 112,
    position: 'absolute',
  },
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
});
