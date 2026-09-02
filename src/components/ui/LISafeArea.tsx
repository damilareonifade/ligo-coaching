import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cn } from '@/lib/utils';

export interface LISafeAreaProps {
  readonly children: ReactNode;
  readonly className?: string;
  /** Bottom inset is off by default — tab bars and sheets own that space. */
  readonly edges?: readonly ('top' | 'bottom')[];
}

export function LISafeArea({ children, className, edges = ['top'] }: LISafeAreaProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className={cn('flex-1 bg-background', className)}
      style={{
        paddingTop: edges.includes('top') ? insets.top : 0,
        paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
      }}
    >
      {children}
    </View>
  );
}
