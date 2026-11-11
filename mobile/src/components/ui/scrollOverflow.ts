/** Pure horizontal scroll overflow helpers shared across UI components and Node unit tests. */

export interface HorizontalOverflowMetrics {
  containerWidth: number;
  contentWidth: number;
  scrollX: number;
  edgeThreshold?: number;
}

export interface HorizontalOverflowState {
  hasOverflow: boolean;
  canScrollLeft: boolean;
  canScrollRight: boolean;
}

/** Computes whether a horizontal scroll track has offscreen items on its left or right edge. */
export function getHorizontalOverflowState({
  containerWidth,
  contentWidth,
  scrollX,
  edgeThreshold = 4,
}: HorizontalOverflowMetrics): HorizontalOverflowState {
  if (containerWidth <= 0 || contentWidth <= containerWidth + edgeThreshold) {
    return { hasOverflow: false, canScrollLeft: false, canScrollRight: false };
  }

  const clampedScrollX = Math.max(0, scrollX);
  const maxScrollX = contentWidth - containerWidth;

  return {
    hasOverflow: true,
    canScrollLeft: clampedScrollX > edgeThreshold,
    canScrollRight: clampedScrollX < maxScrollX - edgeThreshold,
  };
}

