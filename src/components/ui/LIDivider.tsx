import { View } from 'react-native';

import { cn } from '@/lib/utils';

export function LIDivider({ className }: { readonly className?: string }) {
  return <View className={cn('h-px w-full bg-hairline', className)} />;
}
