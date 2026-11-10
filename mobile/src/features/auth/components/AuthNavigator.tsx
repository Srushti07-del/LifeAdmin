/**
 * LifeAdmin Mobile Authentication Navigator
 * Smoothly switches between Login, Register, Forgot Password, and Reset Password views
 * while unauthenticated, with support for route synchronization and deep linking.
 */

import React, { useState, useEffect } from 'react';
import { usePathname, useLocalSearchParams } from 'expo-router';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/ResetPasswordScreen';

export type AuthScreenType = 'login' | 'register' | 'forgot-password' | 'reset-password';

interface AuthNavigatorProps {
  initialScreen?: AuthScreenType;
  initialToken?: string;
}

export function AuthNavigator({
  initialScreen = 'login',
  initialToken = '',
}: AuthNavigatorProps) {
  const [currentScreen, setCurrentScreen] = useState<AuthScreenType>(initialScreen);
  const [resetToken, setResetToken] = useState<string>(initialToken);

  let pathname = '';
  let params: { token?: string } = {};

  try {
    pathname = usePathname();
    params = useLocalSearchParams<{ token?: string }>();
  } catch {
    // Graceful fallback if rendered outside router context
  }

  // Synchronize screen state if deep-linked or routed directly
  useEffect(() => {
    if (pathname.includes('register')) {
      setCurrentScreen('register');
    } else if (pathname.includes('forgot-password')) {
      setCurrentScreen('forgot-password');
    } else if (pathname.includes('reset-password')) {
      setCurrentScreen('reset-password');
      if (params.token) {
        setResetToken(params.token);
      }
    }
  }, [pathname, params.token]);

  if (currentScreen === 'register') {
    return (
      <RegisterScreen
        onNavigateToLogin={() => setCurrentScreen('login')}
        onNavigateToForgotPassword={() => setCurrentScreen('forgot-password')}
      />
    );
  }

  if (currentScreen === 'forgot-password') {
    return (
      <ForgotPasswordScreen
        onNavigateToLogin={() => setCurrentScreen('login')}
        onNavigateToResetPassword={(token?: string) => {
          if (token) setResetToken(token);
          setCurrentScreen('reset-password');
        }}
      />
    );
  }

  if (currentScreen === 'reset-password') {
    return (
      <ResetPasswordScreen
        token={resetToken}
        onNavigateToLogin={() => setCurrentScreen('login')}
        onNavigateToForgotPassword={() => setCurrentScreen('forgot-password')}
      />
    );
  }

  return (
    <LoginScreen
      onNavigateToRegister={() => setCurrentScreen('register')}
      onNavigateToForgotPassword={() => setCurrentScreen('forgot-password')}
      onNavigateToResetPassword={(token?: string) => {
        if (token) setResetToken(token);
        setCurrentScreen('reset-password');
      }}
    />
  );
}

export default AuthNavigator;
