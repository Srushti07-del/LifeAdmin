import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

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

  // Show loading screen while restoring persistent session from SecureStore
  if (isLoading) {
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
