/**
 * LifeAdmin Mobile Password Reset Deep Link Hook
 * Listens for incoming Android App Links (HTTPS) and custom scheme (lifeadmin://) links.
 * Handles cold-start, backgrounded, and foregrounded incoming URL events.
 * Extracts the reset token safely and navigates to /reset-password?token=<token>.
 * Deduplicates identical URL deliveries to prevent navigation loops or UI flicker.
 */

import { useEffect, useRef } from 'react';
import { useRouter, usePathname, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { extractResetPasswordToken } from '../utils/deepLink';

export { extractResetPasswordToken };

export function usePasswordResetDeepLink() {
  const router = useRouter();
  const pathname = usePathname();
  const localParams = useLocalSearchParams<{ token?: string }>();

  // Keep live references to prevent re-subscribing native listeners on every render
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const currentTokenRef = useRef(localParams?.token);
  currentTokenRef.current = localParams?.token;

  // Track previously handled URLs to avoid duplicate navigation
  const lastProcessedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const handleUrl = (url: string | null) => {
      if (!isMounted || !url || typeof url !== 'string') return;

      // Deduplicate identical deliveries
      if (lastProcessedUrlRef.current === url) {
        return;
      }

      const token = extractResetPasswordToken(url);
      if (!token) return;

      // Mark URL as processed
      lastProcessedUrlRef.current = url;

      // If already on reset-password with this exact token, skip re-navigation
      if (pathnameRef.current.includes('reset-password') && currentTokenRef.current === token) {
        return;
      }

      // Safe navigation to reset-password with token parameter
      router.push({
        pathname: '/reset-password',
        params: { token },
      } as any);
    };

    // 1. Cold start: check initial launch URL (app was completely closed)
    Linking.getInitialURL()
      .then((initialUrl) => {
        if (initialUrl) {
          handleUrl(initialUrl);
        }
      })
      .catch(() => {
        // Silently ignore native initial URL check errors
      });

    // 2. Running in background or foreground: listen to native URL events
    const subscription = Linking.addEventListener('url', (event) => {
      if (event?.url) {
        handleUrl(event.url);
      }
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [router]);
}
