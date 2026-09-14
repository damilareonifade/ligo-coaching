import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/api/client';
import {
  useDeleteClientRoutineMutation,
  useSaveClientRoutineMutation,
} from '@/api/clientRoutines';
import { useSaveClientRoutineForCoachMutation } from '@/api/coachClient';
import type { ApiRoutineInstance } from '@/api/types';
import { LIButton, LIText } from '@/components/ui';
import { selectDraftRoutine, useProgramDraftStore } from '@/store/programDraftStore';
import { useUiStore } from '@/store/uiStore';

interface RoutineSaveFooterProps {
  /** Present when editing one already saved; absent for a new routine. */
  readonly routine?: ApiRoutineInstance;
  /**
   * Set when the *coach* is editing this client's copy. It sends the save
   * down the coach's path, and it is why the copy below differs: a coach
   * needs telling that this reaches one person, a client that it reaches
   * nobody else.
   */
  readonly editingForClientId?: string;
}

/**
 * The counterpart to `BuilderSaveFooter`, which writes the coach's *template*.
 * This one writes a copy somebody holds — either the client editing their own,
 * or the coach editing one client's. Nothing here is published to anyone.
 */
export default function RoutineSaveFooter({
  routine,
  editingForClientId,
}: RoutineSaveFooterProps) {
  const router = useRouter();
  const showToast = useUiStore((state) => state.showToast);

  const name = useProgramDraftStore((state) => state.name);
  const note = useProgramDraftStore((state) => state.note);
  const day = useProgramDraftStore(selectDraftRoutine);
  // Memoised: a fresh `[]` on every render would rebuild both callbacks below.
  const blocks = useMemo(() => day?.blocks ?? [], [day]);

  const { mutateAsync: save, isPending: saving } = useSaveClientRoutineMutation();
  const { mutateAsync: remove, isPending: deleting } = useDeleteClientRoutineMutation();
  const { mutateAsync: saveForClient, isPending: savingForClient } =
    useSaveClientRoutineForCoachMutation();

  const routineId = routine?.id;
  const asCoach = editingForClientId !== undefined;
  const fromCoach = routine?.templateId != null;
  const trimmed = name.trim();

  const handleSave = useCallback(async () => {
    const trimmedNote = note.trim();

    try {
      if (asCoach && routine) {
        await saveForClient({
          clientId: editingForClientId,
          routine: {
            ...routine,
            name: trimmed,
            note: trimmedNote.length > 0 ? trimmedNote : null,
            blocks,
          },
        });
        router.back();
        return;
      }

      await save({ id: routineId, name: trimmed, note, blocks });
      // `replace`, not `back`: the saved routine lives on the Train tab, and a
      // builder left on the stack would be a second draft of the same thing.
      router.replace('/train');
    } catch (error) {
      showToast(errorMessage(error), 'danger');
    }
  }, [
    asCoach,
    routine,
    saveForClient,
    editingForClientId,
    save,
    routineId,
    trimmed,
    note,
    blocks,
    router,
    showToast,
  ]);

  const handleDelete = useCallback(async () => {
    if (!routineId) return;
    try {
      await remove(routineId);
      router.replace('/train');
    } catch (error) {
      showToast(errorMessage(error), 'danger');
    }
  }, [remove, routineId, router, showToast]);

  return (
    <View className="gap-2">
      <LIButton
        title={routineId ? 'Save changes' : 'Save routine'}
        onPress={() => void handleSave()}
        disabled={trimmed.length === 0 || blocks.length === 0 || deleting}
        loading={saving || savingForClient}
        fullWidth
        testID="routine-save"
      />

      {/* A coach may change this client's copy but not throw it away — that is
          the client's call, on their own screen. */}
      {routineId && !asCoach ? (
        <LIButton
          title={fromCoach ? 'Remove my copy' : 'Delete routine'}
          onPress={() => void handleDelete()}
          variant="ghost"
          disabled={saving}
          loading={deleting}
          fullWidth
          labelClassName="text-danger"
          testID="routine-delete"
        />
      ) : null}

      <LIText
        size="caption"
        color="muted"
        text={
          asCoach
            ? 'This changes this client’s copy only. Your own version, and everyone else’s, stays as it is.'
            : fromCoach
              ? 'This is your copy. Changes stay yours — your coach keeps theirs.'
              : 'Yours to run whenever. Your coach’s plan stays where it is.'
        }
        className="text-center font-geist"
      />
    </View>
  );
}
