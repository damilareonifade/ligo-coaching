import { useRouter } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { useCallback } from 'react';
import { View } from 'react-native';

import { LIButton, LIText } from '@/components/ui';
import { tokens } from '@/theme/tokens';

interface ChatArchivedNoticeProps {
  readonly coachName: string;
}

/**
 * Detaching closes the thread without deleting it. The dashed border says the
 * same thing the copy does: this is a record now, not a place to type.
 */
export default function ChatArchivedNotice({ coachName }: ChatArchivedNoticeProps) {
  const router = useRouter();

  const attachCoach = useCallback(
    () => router.push('/onboarding/attach-coach?direct=1'),
    [router],
  );

  return (
    <View className="gap-3 border-t border-hairline bg-canvas px-4 py-3">
      <View className="flex-row items-start gap-3 rounded-card border border-dashed border-hairline-strong p-4">
        <Lock color={tokens.muted} size={16} />
        <LIText
          size="caption"
          color="muted"
          text={`Closed when you detached. The history stays in your profile — ${coachName} cannot read or send anything here.`}
          className="flex-1 font-geist"
        />
      </View>

      <LIButton
        title="Attach a coach"
        variant="outline"
        fullWidth
        onPress={attachCoach}
        testID="chat-attach-coach"
      />
    </View>
  );
}
