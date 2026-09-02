import { Dumbbell } from 'lucide-react-native';
import { View } from 'react-native';

import { cn } from '@/lib/utils';
import { tokens } from '@/theme/tokens';

export interface LIBrandMarkProps {
  readonly size?: 'md' | 'lg';
  readonly className?: string;
}

const box = {
  md: 'h-11 w-11',
  lg: 'h-14 w-14',
} as const;

const glyph = {
  md: 20,
  lg: 26,
} as const;

/** Ligo's mark: the app icon in-app, for auth screens and empty brand slots. */
export function LIBrandMark({ size = 'md', className }: LIBrandMarkProps) {
  return (
    <View
      className={cn('items-center justify-center rounded-2xl bg-navy', box[size], className)}
      accessibilityRole="image"
      accessibilityLabel="Ligo"
    >
      <Dumbbell color={tokens.white} size={glyph[size]} />
    </View>
  );
}
