import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/api/client';
import { useSaveProgramMutation } from '@/api/coachPrograms';
import { LIButton, LIText } from '@/components/ui';
import { useProgramDraftStore } from '@/store/programDraftStore';
import { useUiStore } from '@/store/uiStore';

export default function BuilderSaveFooter() {
  const router = useRouter();
  const showToast = useUiStore((state) => state.showToast);
  const { mutateAsync, isPending } = useSaveProgramMutation();

  const kind = useProgramDraftStore((state) => state.kind);
  const name = useProgramDraftStore((state) => state.name);
  const weeks = useProgramDraftStore((state) => state.weeks);
  const days = useProgramDraftStore((state) => state.days);

  const trimmed = name.trim();

  const save = useCallback(async () => {
    try {
      await mutateAsync({ name: trimmed, kind, weeks, days });
      // `replace`, not `back`: the library is where a saved program lives, and
      // a builder left on the stack would be a second draft of the same thing.
      router.replace('/programs');
    } catch (error) {
      showToast(errorMessage(error), 'danger');
    }
  }, [mutateAsync, trimmed, kind, weeks, days, router, showToast]);

  return (
    <View className="gap-2">
      <LIButton
        title={kind === 'routine' ? 'Save routine' : 'Save program'}
        onPress={() => void save()}
        disabled={trimmed.length === 0}
        loading={isPending}
        fullWidth
        testID="builder-save"
      />
      <LIText
        size="caption"
        color="muted"
        text="Saving keeps this yours. Nothing reaches a client until you publish it."
        className="text-center font-geist"
      />
    </View>
  );
}
