import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider as NavigationThemeProvider,
  useRouter,
  usePathname,
  useLocalSearchParams,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import type { NotificationResponse } from 'expo-notifications';
import { Platform, useWindowDimensions } from 'react-native';
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
import { SnackbarViewport } from '@/components/ui/Snackbar';
import { shouldOffsetSnackbarForBottomTabs } from '@/utils/navigationLayout';
import { ThemeProvider as AppThemeProvider, useAppTheme } from '@/context/ThemeContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { SnackbarProvider } from '@/context/SnackbarContext';
import { NetworkProvider } from '@/context/NetworkContext';
import { AuthNavigator } from '@/features/auth/components/AuthNavigator';
import { AuthLoadingScreen } from '@/features/auth/screens/AuthLoadingScreen';
import { usePasswordResetDeepLink } from '@/features/auth';
import { OnboardingScreen } from '@/features/onboarding';
import { notificationService } from '@/features/reminders/services/notificationService';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootNavigator() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const { width } = useWindowDimensions();
  const { user, isLoading, isGuest, isOnboardingCompleted, completeOnboarding } = useAuth();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ token?: string }>();
  const hasBottomTabs = shouldOffsetSnackbarForBottomTabs(pathname, width, Platform.OS);

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

  const isAppReady = Boolean(fontsLoaded && !isLoading);

  useEffect(() => {
    if (isAppReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isAppReady]);

  let mainContent: React.ReactNode;
  let showBottomSnackbarOffset = false;

  if (!isAppReady) {
    mainContent = <AuthLoadingScreen />;
  } else if (pathname.includes('reset-password')) {
    mainContent = <AuthNavigator initialScreen="reset-password" initialToken={params.token || ''} />;
  } else if (!user) {
    mainContent = <AuthNavigator />;
  } else if (!isOnboardingCompleted) {
    mainContent = (
      <OnboardingScreen
        userId={user.id}
        isGuest={isGuest}
        onComplete={completeOnboarding}
      />
    );
  } else {
    showBottomSnackbarOffset = hasBottomTabs;
    mainContent = (
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="ai" options={{ headerShown: false }} />
        <Stack.Screen name="appointments" options={{ headerShown: false }} />
        <Stack.Screen name="documents" options={{ headerShown: false }} />
        <Stack.Screen name="reminders" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="reset-password" options={{ headerShown: false }} />
      </Stack>
    );
  }

  return (
    <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      {mainContent}
      <AnimatedSplashOverlay isReady={isAppReady} />
      {showBottomSnackbarOffset ? (
        <SnackbarViewport hasBottomTabs={true} />
      ) : (
        <SnackbarViewport hasBottomTabs={false} />
      )}
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <SnackbarProvider>
        <AuthProvider>
          <NetworkProvider>
            <RootNavigator />
          </NetworkProvider>
        </AuthProvider>
      </SnackbarProvider>
    </AppThemeProvider>
  );
}
