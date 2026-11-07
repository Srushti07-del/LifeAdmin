/**
 * LifeAdmin Mobile Authentication Navigator
 * Smoothly switches between Login and Registration views while unauthenticated.
 */

import React, { useState } from 'react';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';

export function AuthNavigator() {
  const [currentScreen, setCurrentScreen] = useState<'login' | 'register'>('login');

  if (currentScreen === 'register') {
    return <RegisterScreen onNavigateToLogin={() => setCurrentScreen('login')} />;
  }

  return <LoginScreen onNavigateToRegister={() => setCurrentScreen('register')} />;
}

export default AuthNavigator;
