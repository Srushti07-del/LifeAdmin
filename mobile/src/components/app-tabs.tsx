import { NativeTabs } from 'expo-router/native-tabs';
import { Typography } from '@/constants/typography';
import { useAppTheme } from '@/context/ThemeContext';

export default function AppTabs() {
  const { colors, isDark } = useAppTheme();

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
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
          md="home"
          sf="house"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="tasks">
        <NativeTabs.Trigger.Label>Tasks</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
          md="checklist"
          sf="checklist"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="calendar">
        <NativeTabs.Trigger.Label>Calendar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
          md="calendar_month"
          sf="calendar"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="bills">
        <NativeTabs.Trigger.Label>Bills</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
          md="receipt_long"
          sf="creditcard"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="more">
        <NativeTabs.Trigger.Label>More</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
          md="more_horiz"
          sf="ellipsis"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
