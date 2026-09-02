import { cva, type VariantProps } from 'class-variance-authority';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { cn } from '@/lib/utils';
import { tokens } from '@/theme/tokens';

const button = cva('flex-row items-center justify-center rounded-pill gap-2', {
  variants: {
    variant: {
      primary: 'bg-navy active:bg-midnight',
      accent: 'bg-teal active:bg-navy',
      outline: 'border border-navy bg-transparent active:bg-sky',
      ghost: 'bg-transparent active:bg-sky',
      danger: 'bg-danger active:opacity-90',
    },
    size: {
      sm: 'h-9 px-4',
      md: 'h-12 px-6',
      lg: 'h-14 px-8',
    },
    fullWidth: {
      true: 'w-full',
      false: '',
    },
  },
  defaultVariants: { variant: 'primary', size: 'md', fullWidth: false },
});

const label = cva('font-semibold', {
  variants: {
    variant: {
      primary: 'text-white',
      accent: 'text-navy',
      outline: 'text-navy',
      ghost: 'text-navy',
      danger: 'text-white',
    },
    size: {
      sm: 'text-caption',
      md: 'text-h5',
      lg: 'text-h5',
    },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
});

type ButtonVariants = VariantProps<typeof button>;

export interface LIButtonProps extends ButtonVariants {
  readonly title: string;
  readonly onPress: () => void;
  readonly loading?: boolean;
  readonly disabled?: boolean;
  readonly icon?: ReactNode;
  readonly className?: string;
  readonly testID?: string;
}

export function LIButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  icon,
  className,
  testID,
}: LIButtonProps) {
  const isInactive = disabled || loading;
  const spinnerColor = variant === 'primary' || variant === 'danger' ? tokens.white : tokens.navy;

  return (
    <Pressable
      onPress={onPress}
      disabled={isInactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: isInactive, busy: loading }}
      className={cn(button({ variant, size, fullWidth }), isInactive && 'opacity-50', className)}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <>
          {icon ? <View>{icon}</View> : null}
          <Text className={label({ variant, size })}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}
