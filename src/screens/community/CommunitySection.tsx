import type { ReactNode } from 'react';
import { View } from 'react-native';

import { LIText } from '@/components/ui';

interface CommunitySectionProps {
  /** Upper-cased on screen — "INVITES", "GROUPS", "LEADERBOARDS". */
  readonly title: string;
  readonly children: ReactNode;
}

/** One labelled band of the index. Empty sections are never rendered at all. */
export default function CommunitySection({ title, children }: CommunitySectionProps) {
  return (
    <View className="gap-2">
      <LIText
        size="caption"
        color="muted"
        text={title.toUpperCase()}
        className="px-1 font-geist-medium tracking-wide"
      />
      {children}
    </View>
  );
}
