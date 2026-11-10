import React from 'react';
import { useRouter } from 'expo-router';
import { RegisterScreen } from '@/features/auth/screens/RegisterScreen';

export default function RegisterRoute() {
  const router = useRouter();

  return (
    <RegisterScreen
      onNavigateToLogin={() => {
        router.push('/login' as any);
      }}
      onNavigateToForgotPassword={() => {
        router.push('/forgot-password' as any);
      }}
    />
  );
}
