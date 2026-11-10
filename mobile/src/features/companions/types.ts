/**
 * LifeBuddy Companion Types
 * Strictly aligned with LifeAdmin design system and customer specifications.
 */

export type CompanionSpecies =
  | 'Elemental Spirit'
  | 'Nature Spirit'
  | 'Aquatic Guardian'
  | 'Sky Beast';

export type CompanionElement = 'Light' | 'Nature' | 'Water' | 'Air';

export type GrowthStage = 'Sprout' | 'Bloom' | 'Ascended' | 'Luminary';

export interface CompanionColorScheme {
  primary: string;
  secondary: string;
  glow: string;
  accent: string;
}

export interface Companion {
  id: string;
  name: string;
  defaultName: string;
  title: string;
  species: CompanionSpecies;
  element: CompanionElement;
  bio: string;
  personality: string;
  quote: string;
  colorScheme: CompanionColorScheme;
  unlockedAtStage: number;
  iconName: {
    ios: string;
    android: string;
    web: string;
  };
}

export interface CompanionState {
  activeId: string;
  customName: string;
  xp: number;
  level: number;
  growthStage: GrowthStage;
  streakDays: number;
  lastActiveDate: string;
}

