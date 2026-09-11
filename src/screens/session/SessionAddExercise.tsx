import { Plus } from 'lucide-react-native';
import { useCallback } from 'react';
import { Pressable } from 'react-native';

import { LIText } from '@/components/ui';
import { useUiStore } from '@/store/uiStore';
import { tokens } from '@/theme/tokens';

/** Stubbed until the exercise library ships — same pattern as SocialSignIn. */
export default function SessionAddExercise() {
  const showToast = useUiStore((state) => state.showToast);
  const stub = useCallback(() => showToast('Not connected yet', 'success'), [showToast]);

  return (
    <Pressable
      onPress={stub}
      accessibilityRole="button"
      className="h-12 w-full flex-row items-center justify-center gap-2 rounded-card border border-dashed border-hairline-strong active:opacity-70"
      testID="session-add-exercise"
    >
      <Plus color={tokens.violet} size={18} />
      <LIText
        size="p"
        color="accent"
        text="Add exercise to this session"
        className="font-geist-medium"
      />
    </Pressable>
  );
}
