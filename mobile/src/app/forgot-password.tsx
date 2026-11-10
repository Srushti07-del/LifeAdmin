import React from 'react';
import { useRouter } from 'expo-router';
import { ForgotPasswordScreen } from '@/features/auth/screens/ForgotPasswordScreen';

export default function ForgotPasswordRoute() {
  const router = useRouter();

  return (
    <ForgotPasswordScreen
      onNavigateToLogin={() => {
        router.push('/login' as any);
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

