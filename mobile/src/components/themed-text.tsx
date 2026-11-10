import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { ThemeColor } from '@/constants/theme';
import { Typography } from '@/constants/typography';
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

  return <Text style={[{ color: theme[themeColor ?? 'text'] }, styles[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  small: {
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  smallBold: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  default: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  title: {
    fontFamily: Typography.fontFamilies.editorial,
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '400',
  },
  subtitle: {
    fontFamily: Typography.fontFamilies.editorial,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '400',
  },
  editorial: {
    fontFamily: Typography.fontFamilies.editorial,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '400',
  },
  editorialTitle: {
    fontFamily: Typography.fontFamilies.editorial,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '400',
  },
  editorialSubtitle: {
    fontFamily: Typography.fontFamilies.editorial,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '400',
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
    color: '#087E83',
  },
  code: {
    fontFamily: Typography.fontFamilies.mono,
    fontWeight: Platform.select({ android: '700' }) ?? '500',
    fontSize: 12,
  },
});
