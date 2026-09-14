import { cva, type VariantProps } from 'class-variance-authority';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { cn } from '@/lib/utils';
import { useThemeTokens } from '@/theme/tokens';

const button = cva('flex-row items-center justify-center gap-2', {
  variants: {
    variant: {
      primary: 'bg-violet active:bg-violet-pressed',
      accent: 'bg-violet active:bg-violet-pressed',
      violet: 'bg-violet active:bg-violet-pressed',
      outline: 'border border-violet bg-transparent active:bg-surface-sunken',
      ghost: 'bg-transparent active:bg-surface-sunken',
      danger: 'bg-danger active:opacity-90',
      /** Third-party sign-in: white card on a tinted surface. */
      social: 'border border-border bg-surface active:bg-surface-sunken',
    },
    size: {
      sm: 'h-9 px-4',
      md: 'h-12 px-6',
      lg: 'h-14 px-8',
    },
    shape: {
      pill: 'rounded-pill',
      rounded: 'rounded-2xl',
    },
    fullWidth: {
      true: 'w-full',
      false: '',
    },
  },
  defaultVariants: { variant: 'primary', size: 'md', shape: 'pill', fullWidth: false },
});

const label = cva('font-semibold', {
  variants: {
    variant: {
      primary: 'text-surface',
      accent: 'text-surface',
      violet: 'text-surface',
      outline: 'text-violet',
      ghost: 'text-violet',
      danger: 'text-surface',
      social: 'text-foreground-muted',
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
  /** Override the label `Text`'s className — the base `className` only reaches the `Pressable`. */
  readonly labelClassName?: string;
  /**
   * Spoken name, when `title` is not one — an icon-only button carries an empty
   * `title` and would otherwise reach a screen reader as an unnamed button.
   */
  readonly accessibilityLabel?: string;
  readonly testID?: string;
}

export function LIButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  shape = 'pill',
  fullWidth = false,
  loading = false,
  disabled = false,
  icon,
  className,
  labelClassName,
  accessibilityLabel,
  testID,
}: LIButtonProps) {
  const tokens = useThemeTokens();
  const isInactive = disabled || loading;
  const spinnerColor =
    variant === 'primary' || variant === 'danger' || variant === 'violet' ? tokens.inverse : tokens.violet;

  return (
    <Pressable
      onPress={onPress}
      disabled={isInactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isInactive, busy: loading }}
      className={cn(
        button({ variant, size, shape, fullWidth }),
        isInactive && 'opacity-50',
        className,
      )}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <>
          {icon ? <View>{icon}</View> : null}
          <Text className={cn(label({ variant, size }), labelClassName)}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}
