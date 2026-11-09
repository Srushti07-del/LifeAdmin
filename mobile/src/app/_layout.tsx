import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { DMSerifDisplay_400Regular, DMSerifDisplay_400Regular_Italic } from '@expo-google-fonts/dm-serif-display';
import {
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { ThemeProvider as AppThemeProvider, useAppTheme } from '@/context/ThemeContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AuthNavigator } from '@/features/auth/components/AuthNavigator';
import { AuthLoadingScreen } from '@/features/auth/screens/AuthLoadingScreen';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { isDark } = useAppTheme();
  const { user, isLoading } = useAuth();

  const [fontsLoaded] = useFonts({
    DMSerifDisplay_400Regular,
    DMSerifDisplay_400Regular_Italic,
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded && !isLoading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, isLoading]);

  // Show loading screen while restoring persistent session or loading fonts
  if (isLoading || !fontsLoaded) {
    return (
      <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <AuthLoadingScreen />
      </NavigationThemeProvider>
    );
  }

  // If unauthenticated, redirect to authentication flow (Login / Register / Guest Demo)
  if (!user) {
    return (
      <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
        <AuthNavigator />
      </NavigationThemeProvider>
    );
  }

  // Authenticated user (registered or guest session)
  return (
    <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </AppThemeProvider>
  );
}
