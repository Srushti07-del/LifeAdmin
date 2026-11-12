import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { ThemeColor } from '@/constants/theme';
import {
  Typography,
  resolveInterTypographyOverride,
} from '@/constants/typography';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'title'
    | 'small'
    | 'smallBold'
    | 'subtitle'
    | 'link'
    | 'linkPrimary'
    | 'code'
    | 'editorial'
    | 'editorialTitle'
    | 'editorialSubtitle';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const resolvedThemeColor = themeColor ?? (type === 'linkPrimary' ? 'primary' : 'text');
  const fontOverride = style
    ? resolveInterTypographyOverride(StyleSheet.flatten([styles[type], style]))
    : null;

  return (
    <Text
      style={[{ color: theme[resolvedThemeColor] }, styles[type], style, fontOverride]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: 14,
    lineHeight: 20,
  },
  smallBold: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: 14,
    lineHeight: 20,
  },
  default: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: 16,
    lineHeight: 24,
  },
  title: {
    fontFamily: Typography.fontFamilies.editorial,
    fontSize: 36,
    lineHeight: 42,
  },
  subtitle: {
    fontFamily: Typography.fontFamilies.editorial,
    fontSize: 28,
    lineHeight: 34,
  },
  editorial: {
    fontFamily: Typography.fontFamilies.editorial,
    fontSize: 20,
    lineHeight: 26,
  },
  editorialTitle: {
    fontFamily: Typography.fontFamilies.editorial,
    fontSize: 28,
    lineHeight: 34,
  },
  editorialSubtitle: {
    fontFamily: Typography.fontFamilies.editorial,
    fontSize: 18,
    lineHeight: 24,
  },
  link: {
    fontFamily: Typography.fontFamilies.sansMedium,
    lineHeight: 24,
    fontSize: 14,
  },
  linkPrimary: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    lineHeight: 24,
    fontSize: 14,
  },
  code: {
    fontFamily: Typography.fontFamilies.mono,
    fontWeight: Platform.select({ android: '700' }) ?? '500',
    fontSize: 12,
  },
});
