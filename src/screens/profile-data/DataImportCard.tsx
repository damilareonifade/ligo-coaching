import { ChevronRight } from 'lucide-react-native';
import { useCallback } from 'react';
import { Pressable, View } from 'react-native';

import type { ApiImportSource } from '@/api/types';
import { LICard, LIText } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/store/uiStore';
import { useThemeTokens } from '@/theme/tokens';

interface DataImportCardProps {
  readonly sources: readonly ApiImportSource[];
}

export default function DataImportCard({ sources }: DataImportCardProps) {
  const tokens = useThemeTokens();
  const showToast = useUiStore((state) => state.showToast);
  const stub = useCallback(() => showToast('Not connected yet', 'success'), [showToast]);

  return (
    <LICard className="gap-3">
      <View className="gap-1">
        <LIText
          size="p"
          color="primary"
          text="Import from another app"
          className="font-geist-semibold"
        />
        <LIText
          size="caption"
          color="muted"
          text="Bring your history in. Sets, meals and body weight are mapped; nothing is overwritten."
          className="font-geist"
        />
      </View>

      <View>
        {sources.map((source, index) => (
          <Pressable
            key={source.id}
            onPress={stub}
            accessibilityRole="button"
            accessibilityLabel={`Import from ${source.name}. ${source.meta}`}
            className={cn(
              'flex-row items-center gap-3 py-3 active:opacity-70',
              index > 0 && 'border-t border-border',
            )}
            testID={`import-source-${source.id}`}
          >
            <View className="h-9 w-9 items-center justify-center rounded-2xl bg-violet-weak">
              <LIText
                size="caption"
                color="accent"
                text={source.mark}
                className="font-geist-semibold"
              />
            </View>
            <View className="flex-1 gap-0.5">
              <LIText size="p" color="primary" text={source.name} className="font-geist-medium" />
              <LIText size="caption" color="muted" text={source.meta} className="font-geist" />
            </View>
            <ChevronRight color={tokens['foreground-subtle']} size={18} />
          </Pressable>
        ))}
      </View>
    </LICard>
  );
}
