/**
 * Shared layout metrics for mobile Input (single-line vs multiline).
 * Pure TypeScript so vertical alignment and sizing contracts remain unit-testable.
 */

export interface InputLayoutOptions {
  multiline?: boolean;
  numberOfLines?: number;
}

export interface InputLayoutMetrics {
  containerHeight?: number;
  containerMinHeight: number;
  containerAlignItems: 'center' | 'stretch';
  textInputHeight?: '100%';
  textInputMinHeight?: number;
  textAlignVertical: 'center' | 'top';
  paddingTop: number;
  paddingBottom: number;
  lineHeight?: number;
}

const SINGLE_LINE_HEIGHT = 44;
const MULTILINE_LINE_HEIGHT = 20;
const MULTILINE_VERTICAL_PADDING = 12;
const MULTILINE_MIN_HEIGHT_FLOOR = 76;

export function getInputLayoutMetrics(
  options: InputLayoutOptions = {}
): InputLayoutMetrics {
  if (!options.multiline) {
    return {
      containerHeight: SINGLE_LINE_HEIGHT,
      containerMinHeight: SINGLE_LINE_HEIGHT,
      containerAlignItems: 'center',
      textInputHeight: '100%',
      textInputMinHeight: undefined,
      textAlignVertical: 'center',
      paddingTop: 0,
      paddingBottom: 0,
      lineHeight: undefined,
    };
  }

  const lines =
    typeof options.numberOfLines === 'number' && Number.isFinite(options.numberOfLines)
      ? Math.max(2, Math.floor(options.numberOfLines))
      : 3;

  const minHeight = Math.max(
    MULTILINE_MIN_HEIGHT_FLOOR,
    lines * MULTILINE_LINE_HEIGHT + MULTILINE_VERTICAL_PADDING * 2
  );

  return {
    containerHeight: undefined,
    containerMinHeight: minHeight,
    containerAlignItems: 'stretch',
    textInputHeight: undefined,
    textInputMinHeight: minHeight,
    textAlignVertical: 'top',
    paddingTop: MULTILINE_VERTICAL_PADDING,
    paddingBottom: MULTILINE_VERTICAL_PADDING,
    lineHeight: MULTILINE_LINE_HEIGHT,
  };
}

