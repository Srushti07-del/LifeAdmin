/**
 * LifeBuddy Companion Catalog & Growth System
 * 4 original virtual companions designed with soft 3D clay aesthetic.
 * Faithful to LifeAdmin specifications: positive reinforcement only,
 * never punish inactivity, companions never get sick or disappear.
 */

import { Companion, CompanionState, GrowthStage } from './types';

export const COMPANIONS: Companion[] = [
  {
    id: 'aura',
    name: 'Aura',
    defaultName: 'Aura',
    title: 'The Celestial Luminary',
    species: 'Elemental Spirit',
    element: 'Light',
    bio: 'Born from morning twilight, Aura illuminates scattered thoughts and brings sharp, calm focus to busy days.',
    personality: 'Serene, insightful, and quietly encouraging.',
    quote: 'Every small completed step clears the path ahead.',
    colorScheme: {
      primary: '#168F91',
      secondary: '#69BDB7',
      glow: '#D3EAE7',
      accent: '#F59E0B',
    },
    unlockedAtStage: 1,
    iconName: {
      ios: 'sparkles',
      android: 'auto_awesome',
      web: 'auto_awesome',
    },
  },
  {
    id: 'mossy',
    name: 'Mossy',
    defaultName: 'Mossy',
    title: 'The Verdant Sprout',
    species: 'Nature Spirit',
    element: 'Nature',
    bio: 'Rooted in timeless forest earth, Mossy nurtures steady, stress-free daily routines that blossom naturally over time.',
    personality: 'Grounded, patient, and deeply reassuring.',
    quote: 'Slow progress is still magnificent growth.',
    colorScheme: {
      primary: '#10B981',
      secondary: '#059669',
      glow: '#D1FAE5',
      accent: '#84CC16',
    },
    unlockedAtStage: 1,
    iconName: {
      ios: 'leaf.fill',
      android: 'eco',
      web: 'eco',
    },
  },
  {
    id: 'nori',
    name: 'Nori',
    defaultName: 'Nori',
    title: 'The Tide Hopper',
    species: 'Aquatic Guardian',
    element: 'Water',
    bio: 'Gliding through currents with effortless grace, Nori turns complicated administrative tides into smooth, sailing water.',
    personality: 'Playful, adaptive, and resilient.',
    quote: 'Ride the wave one task at a time; you are unsinkable.',
    colorScheme: {
      primary: '#0284C7',
      secondary: '#38BDF8',
      glow: '#E0F2FE',
      accent: '#06B6D4',
    },
    unlockedAtStage: 1,
    iconName: {
      ios: 'drop.fill',
      android: 'water_drop',
      web: 'water_drop',
    },
  },
  {
    id: 'zephyr',
    name: 'Zephyr',
    defaultName: 'Zephyr',
    title: 'The Cloudling',
    species: 'Sky Beast',
    element: 'Air',
    bio: 'Soft as cotton and light as breath, Zephyr blows away mental clutter so you can breathe freely and rest easy.',
    personality: 'Gentle, lighthearted, and soothing.',
    quote: 'Inhale clarity, exhale the clutter.',
    colorScheme: {
      primary: '#6366F1',
      secondary: '#818CF8',
      glow: '#EEF2FF',
      accent: '#EC4899',
    },
    unlockedAtStage: 1,
    iconName: {
      ios: 'wind',
      android: 'air',
      web: 'air',
    },
  },
];

export const INITIAL_COMPANION_STATE: CompanionState = {
  activeId: 'aura',
  customName: 'Aura',
  xp: 150,
  level: 1,
  growthStage: 'Sprout',
  streakDays: 1,
  lastActiveDate: new Date().toISOString().split('T')[0],
};

export function getGrowthStage(level: number): GrowthStage {
  if (level >= 10) return 'Luminary';
  if (level >= 6) return 'Ascended';
  if (level >= 3) return 'Bloom';
  return 'Sprout';
}

export function getCompanionById(id: string): Companion {
  return COMPANIONS.find((c) => c.id === id) || COMPANIONS[0];
}

