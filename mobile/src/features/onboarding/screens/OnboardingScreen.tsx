/**
 * LifeAdmin Mobile Onboarding Screen
 * Orchestrates the 5-step native onboarding experience for new users and guest demo sessions.
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/context/ThemeContext';
import { OnboardingProgressBar } from '../components/OnboardingProgressBar';
import { WelcomeStep } from '../components/WelcomeStep';
import { PersonalSetupStep } from '../components/PersonalSetupStep';
import { FeaturesTourStep } from '../components/FeaturesTourStep';
import { MeetLifeBuddyStep } from '../components/MeetLifeBuddyStep';
import { ReadyStep } from '../components/ReadyStep';
import { onboardingService } from '../services/onboardingService';
import { OnboardingStep, OnboardingPreferences, INITIAL_ONBOARDING_PREFERENCES } from '../types';

export interface OnboardingScreenProps {
  userId: string;
  isGuest?: boolean;
  onComplete: () => void;
}

export function OnboardingScreen({
  userId,
  isGuest = false,
  onComplete,
}: OnboardingScreenProps) {
  const { colors } = useAppTheme();
  const [step, setStep] = useState<OnboardingStep>(1);
  const [preferences, setPreferences] = useState<OnboardingPreferences>(INITIAL_ONBOARDING_PREFERENCES);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing in-progress preferences if any
  useEffect(() => {
    let isMounted = true;
    onboardingService.getStoredPreferences(userId).then((saved) => {
      if (isMounted && saved) {
        setPreferences(saved);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [userId]);

  // Handle hardware back button on Android
  useEffect(() => {
    const onBackPress = () => {
      if (step > 1) {
        setStep((prev) => (prev - 1) as OnboardingStep);
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [step]);

  const updatePreferences = (updates: Partial<OnboardingPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...updates };
      // Save progress
      onboardingService.saveStoredPreferences(userId, next);
      return next;
    });
  };

  const handleNext = () => {
    if (step < 5) {
      setStep((prev) => (prev + 1) as OnboardingStep);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as OnboardingStep);
    }
  };

  const handleSkip = async () => {
    setIsSaving(true);
    try {
      await onboardingService.skipOnboarding(userId, isGuest);
    } finally {
      setIsSaving(false);
      onComplete();
    }
  };

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      await onboardingService.completeOnboarding(userId, preferences, isGuest);
    } finally {
      setIsSaving(false);
      onComplete();
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'bottom', 'left', 'right']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Top Progress & Skip Bar */}
      <OnboardingProgressBar
        currentStep={step}
        totalSteps={5}
        onSkip={handleSkip}
        showSkip={!isSaving}
      />

      {/* Active Step Content */}
      <View style={styles.content}>
        {step === 1 && <WelcomeStep onNext={handleNext} />}
        {step === 2 && (
          <PersonalSetupStep
            preferences={preferences}
            onUpdatePreferences={updatePreferences}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}
        {step === 3 && (
          <FeaturesTourStep onNext={handleNext} onBack={handleBack} />
        )}
        {step === 4 && (
          <MeetLifeBuddyStep
            preferences={preferences}
            onUpdatePreferences={updatePreferences}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}
        {step === 5 && (
          <ReadyStep
            preferences={preferences}
            onFinish={handleFinish}
            onBack={handleBack}
            isSaving={isSaving}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

