import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ResetPasswordScreen } from '@/features/auth/screens/ResetPasswordScreen';

export default function ResetPasswordRoute() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();

  return (
    <ResetPasswordScreen
      token={token || ''}
      onNavigateToLogin={() => {
        router.push('/login' as any);
      }}
      onNavigateToForgotPassword={() => {
        router.push('/forgot-password' as any);
      }}
    />
  );
}

