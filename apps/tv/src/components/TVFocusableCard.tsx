import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { Colors, Radius } from '../theme/tokens';

interface TVFocusableCardProps {
  onPress: () => void;
  onFocus?: () => void;
  isFocused?: boolean;
  style?: StyleProp<ViewStyle>;
  focusedStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export const TVFocusableCard: React.FC<TVFocusableCardProps> = ({
  onPress,
  onFocus,
  isFocused = false,
  style,
  focusedStyle,
  children,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      onFocus={onFocus}
      style={[
        styles.base,
        style,
        isFocused && styles.focused,
        isFocused && focusedStyle,
      ]}
    >
      {children}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: Colors.backgroundElevated,
  },
  focused: {
    borderColor: Colors.accentPrimary,
    transform: [{ scale: 1.04 }],
    elevation: 8,
  },
});
