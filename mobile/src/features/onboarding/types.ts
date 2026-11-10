/**
 * LifeAdmin Mobile Onboarding Types
 */

export interface OnboardingPreferences {
  categories: string[];
  notificationsEnabled: boolean;
  defaultReminderTiming: number[];
  preferredCurrency: string;
  companionId: string;
  companionName: string;
}

export type OnboardingStep = 1 | 2 | 3 | 4 | 5;

export interface CurrencyOption {
  code: string;
  symbol: string;
  label: string;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: 'INR', symbol: '₹', label: 'INR (₹)' },
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
];

export interface LifeDomainOption {
  id: string;
  label: string;
  icon: string;
}

export const AVAILABLE_DOMAINS: LifeDomainOption[] = [
  { id: 'Personal', label: 'Personal', icon: 'person' },
  { id: 'Work', label: 'Work & Career', icon: 'business_center' },
  { id: 'Finance', label: 'Finance & Bills', icon: 'account_balance_wallet' },
  { id: 'Health', label: 'Health & Wellness', icon: 'favorite' },
  { id: 'Education', label: 'Education & Study', icon: 'school' },
  { id: 'Home', label: 'Home & Rent', icon: 'home' },
];

export const SENSIBLE_DEFAULT_CATEGORIES: string[] = [
  'Personal',
  'Work',
  'Finance',
  'Health',
];

/**
 * Initial state for first-time onboarding users (starts with zero domains selected).
 */
export const INITIAL_ONBOARDING_PREFERENCES: OnboardingPreferences = {
  categories: [],
  notificationsEnabled: true,
  defaultReminderTiming: [7, 3, 1, 0],
  preferredCurrency: 'INR',
  companionId: 'aura',
  companionName: 'Aura',
};

/**
 * Sensible product defaults used when onboarding is skipped or defaults are applied.
 */
export const DEFAULT_ONBOARDING_PREFERENCES: OnboardingPreferences = {
  categories: SENSIBLE_DEFAULT_CATEGORIES,
  notificationsEnabled: true,
  defaultReminderTiming: [7, 3, 1, 0],
  preferredCurrency: 'INR',
  companionId: 'aura',
  companionName: 'Aura',
};

