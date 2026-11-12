import { useWindowDimensions } from 'react-native';
import { NativeTabs } from 'expo-router/native-tabs';
import { AdaptiveTabShell } from '@/components/AdaptiveTabShell';
import { Typography } from '@/constants/typography';
import { useAppTheme } from '@/context/ThemeContext';
import { getNavigationLayoutMode } from '@/utils/navigationLayout';

export default function AppTabs() {
  const { colors, isDark } = useAppTheme();
  const { width } = useWindowDimensions();
  const layoutMode = getNavigationLayoutMode(width);

  if (layoutMode !== 'phone-tabs') {
    return <AdaptiveTabShell layoutMode={layoutMode} />;
  }

  return (
    <NativeTabs
      backgroundColor={isDark ? colors.surfaceSecondary : colors.surface}
      indicatorColor={colors.primarySoft}
      iconColor={{
        default: colors.textMuted,
        selected: colors.primary,
      }}
      labelStyle={{
        default: {
          color: colors.textMuted,
          fontFamily: Typography.fontFamilies.sansMedium,
        },
        selected: {
          color: colors.primary,
          fontFamily: Typography.fontFamilies.sansSemiBold,
        },
      }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          md="home"
          sf={{ default: 'house', selected: 'house.fill' }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="tasks">
        <NativeTabs.Trigger.Label>Tasks</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          md="checklist"
          sf={{ default: 'checkmark.square', selected: 'checkmark.square.fill' }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="calendar">
        <NativeTabs.Trigger.Label>Calendar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          md="calendar_month"
          sf="calendar"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="bills">
        <NativeTabs.Trigger.Label>Bills</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          md="receipt_long"
          sf={{ default: 'creditcard', selected: 'creditcard.fill' }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="more">
        <NativeTabs.Trigger.Label>More</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          md="pending"
          sf={{ default: 'ellipsis.circle', selected: 'ellipsis.circle.fill' }}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
