/**
 * LifeAdmin Mobile — Pure Responsive Navigation & Safe Layout Utilities
 * Coordinates phone bottom tabs (<768px), collapsible tablet drawers (768–1023px),
 * and permanent side navigation rails (1024px+), plus safe Stack vs Tab clearance.
 * Kept pure TypeScript with zero React Native imports for fast unit testing.
 */

export type NavigationLayoutMode = 'phone-tabs' | 'tablet-drawer' | 'desktop-rail';

export const PRIMARY_TAB_PATHS = new Set<string>([
  '/',
  '/tasks',
  '/calendar',
  '/bills',
  '/more',
]);

/**
 * Classifies viewport width into one of the three DESIGN.md navigation patterns:
 * - `< 768px`: Native bottom tab bar (`phone-tabs`)
 * - `768px–1023px`: Collapsible tablet navigation drawer (`tablet-drawer`)
 * - `>= 1024px`: Permanent compact side navigation rail (`desktop-rail`)
 */
export function getNavigationLayoutMode(width: number): NavigationLayoutMode {
  if (!Number.isFinite(width) || width < 768) {
    return 'phone-tabs';
  }
  if (width < 1024) {
    return 'tablet-drawer';
  }
  return 'desktop-rail';
}

/**
 * Normalizes a pathname and checks whether the active screen is one of the
 * 5 primary tab destinations (as opposed to pushed Stack sub-screens).
 */
export function isPrimaryTabPathname(pathname: string): boolean {
  const withoutQuery = pathname.split('?')[0]?.split('#')[0] ?? '/';
  const normalized = withoutQuery.replace(/\/+$/, '') || '/';
  return PRIMARY_TAB_PATHS.has(normalized);
}

/**
 * Determines whether the root SnackbarViewport should reserve bottom-tab height.
 * Only applies on native phone viewports while actively viewing a primary tab.
 */
export function shouldOffsetSnackbarForBottomTabs(
  pathname: string,
  windowWidth: number,
  platformOS: string = 'android',
): boolean {
  if (platformOS === 'web') {
    return false;
  }
  return (
    getNavigationLayoutMode(windowWidth) === 'phone-tabs' &&
    isPrimaryTabPathname(pathname)
  );
}

export interface SafeBottomInsetOptions {
  insetsBottom: number;
  extraSpacing: number;
  windowWidth: number;
  isTabScreen: boolean;
  bottomTabInset?: number;
  platformOS?: string;
}

/**
 * Computes consistent bottom scroll clearance for both primary tab screens and
 * pushed root-Stack screens without leaving phantom tab gaps on pushed routes or tablets.
 */
export function getSafeBottomInset({
  insetsBottom,
  extraSpacing,
  windowWidth,
  isTabScreen,
  bottomTabInset = 80,
  platformOS = 'android',
}: SafeBottomInsetOptions): number {
  const usesBottomTabs =
    isTabScreen &&
    platformOS !== 'web' &&
    getNavigationLayoutMode(windowWidth) === 'phone-tabs';

  const baseInset = usesBottomTabs ? bottomTabInset : insetsBottom;
  return baseInset + extraSpacing;
}

export const FAB_HEIGHT = 56;
export const FAB_MARGIN = 16;
export const FAB_SCROLL_CLEARANCE = 72;
export const FAB_SNACKBAR_CLEARANCE = 84;

export interface FabBottomOffsetOptions {
  insetsBottom: number;
  windowWidth: number;
  isTabScreen: boolean;
  bottomTabInset?: number;
  platformOS?: string;
  isSnackbarVisible?: boolean;
  marginBottom?: number;
}

/**
 * Computes the floating action button's bottom offset so it never covers bottom navigation
 * bars on phones, honors safe-area insets on tablets/side-rail/pushed Stack screens,
 * and lifts cleanly above an active bottom Snackbar without blocking dismiss/Undo actions.
 */
export function getFabBottomOffset({
  insetsBottom,
  windowWidth,
  isTabScreen,
  bottomTabInset = 80,
  platformOS = 'android',
  isSnackbarVisible = false,
  marginBottom = FAB_MARGIN,
}: FabBottomOffsetOptions): number {
  const usesBottomTabs =
    isTabScreen &&
    platformOS !== 'web' &&
    getNavigationLayoutMode(windowWidth) === 'phone-tabs';

  const safeBottom = Number.isFinite(insetsBottom) ? Math.max(0, insetsBottom) : 0;
  const restingBottom = usesBottomTabs
    ? Math.max(bottomTabInset, safeBottom) + marginBottom
    : safeBottom + marginBottom;

  if (!isSnackbarVisible) {
    return restingBottom;
  }

  const snackbarBottom = usesBottomTabs
    ? Math.max(safeBottom, bottomTabInset) + 12
    : Math.max(safeBottom, 12) + 12;

  return Math.max(restingBottom, snackbarBottom + FAB_SNACKBAR_CLEARANCE);
}

/**
 * Computes scroll-container bottom padding that clears both navigation chrome and a FAB.
 */
export function getFabScrollBottomPadding(
  options: Omit<SafeBottomInsetOptions, 'extraSpacing'> & { baseSpacing?: number },
): number {
  const baseSpacing = options.baseSpacing ?? 24;
  return getSafeBottomInset({
    ...options,
    extraSpacing: baseSpacing + FAB_SCROLL_CLEARANCE,
  });
}

export interface BackCapableRouter {
  canGoBack: () => boolean;
  back: () => void;
  replace: (href: any) => void;
}

/**
 * Navigates back along the Stack when history exists, or falls back cleanly
 * to the parent hub route (e.g., when opened from a notification or cold deep link).
 */
export function navigateBackSafely(
  router: BackCapableRouter,
  fallbackHref: string = '/more',
): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallbackHref);
  }
}
