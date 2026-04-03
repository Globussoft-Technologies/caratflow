import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  type ViewStyle,
} from 'react-native';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

const variantClasses: Record<Variant, { container: string; text: string }> = {
  primary: {
    container: 'bg-primary-400',
    text: 'text-white font-semibold',
  },
  secondary: {
    container: 'bg-surface-100 border border-surface-300',
    text: 'text-surface-800 font-medium',
  },
  ghost: {
    container: 'bg-transparent',
    text: 'text-primary-500 font-medium',
  },
  danger: {
    container: 'bg-red-500',
    text: 'text-white font-semibold',
  },
};

const sizeClasses: Record<Size, { container: string; text: string }> = {
  sm: { container: 'px-3 py-2 rounded-lg', text: 'text-sm' },
  md: { container: 'px-4 py-3 rounded-xl', text: 'text-base' },
  lg: { container: 'px-6 py-4 rounded-xl', text: 'text-lg' },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
}: ButtonProps) {
  const v = variantClasses[variant];
  const s = sizeClasses[size];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      className={`flex-row items-center justify-center ${v.container} ${s.container} ${
        isDisabled ? 'opacity-50' : 'active:opacity-80'
      }`}
      onPress={onPress}
      disabled={isDisabled}
      style={style}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? '#fff' : '#d4af37'}
        />
      ) : (
        <>
          {icon}
          <Text
            className={`${v.text} ${s.text} ${icon ? 'ml-2' : ''}`}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}
