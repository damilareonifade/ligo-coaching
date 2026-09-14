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
  const note = useProgramDraftStore((state) => state.note);
  const weeks = useProgramDraftStore((state) => state.weeks);
  const sessionsPerWeek = useProgramDraftStore((state) => state.sessionsPerWeek);
  const routines = useProgramDraftStore((state) => state.routines);

  const trimmed = name.trim();

  const save = useCallback(async () => {
    try {
      const saved = await mutateAsync({ name: trimmed, note, kind, weeks, sessionsPerWeek, routines });
      // Straight to the program itself, not the library: assigning it is the
      // next thing a coach does, and that button lives on its screen.
      // `replace`, not `back` — a builder left on the stack would be a second
      // draft of the same thing.
      router.replace({ pathname: '/programs/[id]', params: { id: saved.id } });
    } catch (error) {
      showToast(errorMessage(error), 'danger');
    }
  }, [mutateAsync, trimmed, note, kind, weeks, sessionsPerWeek, routines, router, showToast]);

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
