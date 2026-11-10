import React from 'react';
import { useRouter } from 'expo-router';
import { LoginScreen } from '@/features/auth/screens/LoginScreen';

export default function LoginRoute() {
  const router = useRouter();

  return (
    <LoginScreen
      onNavigateToRegister={() => {
        router.push('/register' as any);
      }}
      onNavigateToForgotPassword={() => {
        router.push('/forgot-password' as any);
      }}
      onNavigateToResetPassword={(token?: string) => {
        if (token) {
          router.push({ pathname: '/reset-password', params: { token } } as any);
        } else {
          router.push('/reset-password' as any);
        }
      }}
    />
  );
}
