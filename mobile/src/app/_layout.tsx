import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
  useRouter,
  usePathname,
  useLocalSearchParams,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import type { NotificationResponse } from 'expo-notifications';
import { Platform } from 'react-native';
import { useEffect, useRef, useCallback } from 'react';
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
import { usePasswordResetDeepLink } from '@/features/auth';
import { OnboardingScreen } from '@/features/onboarding';
import { notificationService } from '@/features/reminders/services/notificationService';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const router = useRouter();
  const { isDark } = useAppTheme();
  const { user, isLoading, isGuest, isOnboardingCompleted, completeOnboarding } = useAuth();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ token?: string }>();

  // Register Android App Link and custom scheme deep link listener
  usePasswordResetDeepLink();

  // Pending cold-start notification navigation target
  const pendingNotificationRef = useRef<{
    url?: string;
    reminderId?: string;
    userId?: string;
  } | null>(null);
  const handledInitialNotificationIdRef = useRef<string | null>(null);

  // Initialize Android notification channel safely on native platforms only
  useEffect(() => {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') return;
    notificationService.initialize().catch(() => {});
  }, []);

  const navigateToNotificationTarget = useCallback(
    (data?: { url?: string; reminderId?: string; userId?: string }) => {
      if (!data) return;

      // User isolation: ignore notifications targeting another user's account
      if (data.userId && user?.id && data.userId !== user.id) {
        return;
      }

      if (data.reminderId) {
        router.push(`/reminders?reminderId=${data.reminderId}` as any);
      } else if (data.url) {
        router.push(data.url as any);
      }
    },
    [router, user?.id]
  );

  // Listen for local/push notification tap (background and cold start)
  useEffect(() => {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') return;

    let isMounted = true;

    const handleResponse = (response: NotificationResponse) => {
      const data = response?.notification?.request?.content?.data as
        | {
            url?: string;
            reminderId?: string;
            userId?: string;
          }
        | undefined;

      if (isLoading || !user) {
        pendingNotificationRef.current = data || null;
      } else {
        navigateToNotificationTarget(data);
      }
    };

    const subscription = notificationService.addNotificationResponseListener(handleResponse);

    notificationService
      .getLastNotificationResponseAsync()
      .then((response) => {
        if (!isMounted || !response) return;
        const responseId = response.notification?.request?.identifier ?? null;
        if (responseId && handledInitialNotificationIdRef.current === responseId) {
          return;
        }
        handledInitialNotificationIdRef.current = responseId;
        handleResponse(response);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
      subscription?.remove();
    };
  }, [isLoading, user, navigateToNotificationTarget]);

  // When loading finishes and user session is active, process any cold-start notification
  useEffect(() => {
    if (!isLoading && user && pendingNotificationRef.current) {
      const pending = pendingNotificationRef.current;
      pendingNotificationRef.current = null;
      setTimeout(() => {
        navigateToNotificationTarget(pending);
      }, 150);
    }
  }, [isLoading, user, navigateToNotificationTarget]);

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

  // If navigating to password reset (via Android App Link, custom scheme, or route push),
  // present the reset password screen with pre-filled token
  if (pathname.includes('reset-password')) {
    return (
      <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
        <AuthNavigator initialScreen="reset-password" initialToken={params.token || ''} />
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

  // If authenticated but onboarding not yet completed, present native onboarding flow
  if (!isOnboardingCompleted) {
    return (
      <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
        <OnboardingScreen
          userId={user.id}
          isGuest={isGuest}
          onComplete={completeOnboarding}
        />
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
