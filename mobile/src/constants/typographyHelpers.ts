/**
 * Pure typography font-weight resolution helpers (platform-agnostic for testability).
 */

export const BASE_FONT_FAMILIES = {
  editorial: 'DMSerifDisplay_400Regular',
  editorialItalic: 'DMSerifDisplay_400Regular_Italic',
  sansLight: 'Inter_300Light',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
} as const;

const SANS_FONT_FAMILIES = new Set<string>([
  BASE_FONT_FAMILIES.sansLight,
  BASE_FONT_FAMILIES.sans,
  BASE_FONT_FAMILIES.sansMedium,
  BASE_FONT_FAMILIES.sansSemiBold,
  BASE_FONT_FAMILIES.sansBold,
]);

export function resolveSansFontFamilyForWeight(
  weight?: string | number | null,
): string {
  switch (String(weight ?? '').trim().toLowerCase()) {
    case '300':
    case 'light':
      return BASE_FONT_FAMILIES.sansLight;
    case '500':
    case 'medium':
      return BASE_FONT_FAMILIES.sansMedium;
    case '600':
    case 'semibold':
      return BASE_FONT_FAMILIES.sansSemiBold;
    case '700':
    case '800':
    case '900':
    case 'bold':
      return BASE_FONT_FAMILIES.sansBold;
    case '400':
    case 'normal':
    default:
      return BASE_FONT_FAMILIES.sans;
  }
}

/**
 * Resolves numeric/keyword fontWeight styles onto the matching loaded Inter font file
 * for Android/iOS consistency without overriding DM Serif Display or monospace typography.
 */
export function resolveInterTypographyOverride(flattened?: {
  fontFamily?: string;
  fontWeight?: string | number;
} | null): { fontFamily: string; fontWeight: undefined } | null {
  if (!flattened || flattened.fontWeight == null) {
    return null;
  }

  const family = flattened.fontFamily;
  if (family && !SANS_FONT_FAMILIES.has(family)) {
    return null;
  }

  return {
    fontFamily: resolveSansFontFamilyForWeight(flattened.fontWeight),
    fontWeight: undefined,
  };
}

