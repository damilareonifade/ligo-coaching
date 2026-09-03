import { ImageIcon } from 'lucide-react-native';
import { useCallback } from 'react';
import { View } from 'react-native';

import { LIButton, LIText } from '@/components/ui';
import { useUiStore } from '@/store/uiStore';
import { tokens } from '@/theme/tokens';

interface CheckInPhotoRowProps {
  readonly photos: number;
}

/**
 * Not wired to the camera roll yet — the row exists so the count on an existing
 * check-in is visible while editing it, rather than silently disappearing.
 */
export default function CheckInPhotoRow({ photos }: CheckInPhotoRowProps) {
  const showToast = useUiStore((state) => state.showToast);
  const attach = useCallback(() => showToast('Not connected yet', 'success'), [showToast]);

  return (
    <View className="flex-row items-center gap-3 rounded-card border border-dashed border-hairline-strong p-4">
      <ImageIcon color={tokens.muted} size={18} />
      <LIText
        size="caption"
        color="muted"
        text={
          photos === 0
            ? 'No photos attached'
            : `${photos} photo${photos === 1 ? '' : 's'} attached`
        }
        className="flex-1 font-geist"
      />
      <LIButton
        title="Attach"
        size="sm"
        variant="outline"
        onPress={attach}
        testID="check-in-attach-photo"
      />
    </View>
  );
}
