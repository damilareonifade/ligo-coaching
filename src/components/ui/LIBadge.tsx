import { cva, type VariantProps } from 'class-variance-authority';
import { Pressable, Text, View } from 'react-native';

import { cn } from '@/lib/utils';

const badge = cva('self-start rounded-pill px-3 py-1', {
  variants: {
    tone: {
      neutral: 'bg-field',
      accent: 'bg-violet-weak',
      violet: 'bg-violet-weak',
      success: 'bg-success/15',
      warning: 'bg-warning/15',
      danger: 'bg-danger/10',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

const badgeLabel = cva('text-caption font-semibold', {
  variants: {
    tone: {
      neutral: 'text-dark-gray',
      accent: 'text-violet',
      violet: 'text-violet',
      success: 'text-success',
      warning: 'text-warning',
      danger: 'text-danger',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

export interface LIBadgeProps extends VariantProps<typeof badge> {
  readonly label: string;
  readonly className?: string;
  /** Override the label `Text`'s className — the base `className` only reaches the container `View`. */
  readonly labelClassName?: string;
  /**
   * Makes the pill itself the target, as `LICard` does — for a chip that stands
   * for something you can open, e.g. a permission label leading to permissions.
   */
  readonly onPress?: () => void;
  readonly testID?: string;
}

export function LIBadge({
  label,
  tone = 'neutral',
  className,
  labelClassName,
  onPress,
  testID,
}: LIBadgeProps) {
  const body = <Text className={cn(badgeLabel({ tone }), labelClassName)}>{label}</Text>;

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={8}
        className={cn(badge({ tone }), 'active:opacity-70', className)}
        testID={testID}
      >
        {body}
      </Pressable>
    );
  }

  return (
    <View className={cn(badge({ tone }), className)} testID={testID}>
      {body}
    </View>
  );
}
