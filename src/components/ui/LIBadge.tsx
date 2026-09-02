import { cva, type VariantProps } from 'class-variance-authority';
import { Text, View } from 'react-native';

import { cn } from '@/lib/utils';

const badge = cva('self-start rounded-pill px-3 py-1', {
  variants: {
    tone: {
      neutral: 'bg-gray',
      accent: 'bg-light-teal',
      success: 'bg-light-teal',
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
      accent: 'text-navy',
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
}

export function LIBadge({ label, tone = 'neutral', className }: LIBadgeProps) {
  return (
    <View className={cn(badge({ tone }), className)}>
      <Text className={badgeLabel({ tone })}>{label}</Text>
    </View>
  );
}
