import { SymbolView } from 'expo-symbols';
import React, { useState } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { Radius, Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useIsDark, useTheme } from '@/hooks/use-theme';

export interface SearchInputProps extends Omit<TextInputProps, 'style'> {
  value: string;
  onChangeText: (text: string) => void;
  onClear?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

export const SearchInput = React.forwardRef<React.ComponentRef<typeof TextInput>, SearchInputProps>(
  (
    {
      value,
      onChangeText,
      onClear,
      placeholder = 'Search...',
      containerStyle,
      inputStyle,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const colors = useTheme();
    const isDark = useIsDark();
    const [isFocused, setIsFocused] = useState(false);

    const handleClear = () => {
      onChangeText('');
      onClear?.();
    };

    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.surface,
            borderColor: isFocused ? colors.primary : colors.border,
            borderWidth: isFocused ? 1.5 : 1,
          },
          containerStyle,
        ]}
      >
        <View style={styles.searchIconContainer}>
          <SymbolView
            name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
            size={16}
            weight="medium"
            tintColor={isFocused ? colors.primary : colors.textMuted}
          />
        </View>

        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          clearButtonMode="never"
          style={[
            styles.input,
            { color: colors.text },
            inputStyle,
          ]}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />

        {value.length > 0 ? (
          <Pressable
            onPress={handleClear}
            hitSlop={12}
            style={({ pressed }) => [
              styles.clearButton,
              { backgroundColor: colors.surfaceSecondary },
              pressed && styles.clearPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <SymbolView
              name={{ ios: 'xmark', android: 'close', web: 'close' }}
              size={12}
              weight="bold"
              tintColor={colors.textSecondary}
            />
          </Pressable>
        ) : null}
      </View>
    );
  }
);

SearchInput.displayName = 'SearchInput';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.three,
    overflow: 'hidden',
    width: '100%',
  },
  searchIconContainer: {
    marginRight: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.sm,
    paddingVertical: 0,
  },
  clearButton: {
    width: 20,
    height: 20,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.two,
  },
  clearPressed: {
    opacity: 0.7,
  },
});

export default SearchInput;

