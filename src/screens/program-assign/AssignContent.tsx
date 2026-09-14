import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { useAssignProgramMutation } from '@/api/coachPrograms';
import type { ApiProgramDetail, ApiRosterClient } from '@/api/types';
import RosterPickList from '@/components/roster/RosterPickList';
import { LIButton, LICard, LIText } from '@/components/ui';
import { useUiStore } from '@/store/uiStore';

interface AssignContentProps {
  readonly program: ApiProgramDetail;
  readonly clients: readonly ApiRosterClient[];
}

function clientCount(n: number): string {
  return `${n} ${n === 1 ? 'client' : 'clients'}`;
}

/**
 * Who holds this program.
 *
 * The list is every client on the roster, ticked where they already hold a
 * copy — so the same screen adds and removes. Removing is not the mirror of
 * adding, though: it destroys a copy the client may have changed and may have
 * been training from, so it is confirmed by name before anything is sent.
 */
export default function AssignContent({ program, clients }: AssignContentProps) {
  const router = useRouter();
  const showToast = useUiStore((state) => state.showToast);
  const { mutate: setAssignment, isPending } = useAssignProgramMutation();

  const currentIds = program.assignedIds;
  const [selectedIds, setSelectedIds] = useState<readonly string[]>(currentIds);

  const { added, removed, dirty } = useMemo(() => {
    const addedIds = selectedIds.filter((id) => !currentIds.includes(id));
    const removedIds = currentIds.filter((id) => !selectedIds.includes(id));
    return {
      added: addedIds,
      removed: removedIds,
      dirty: addedIds.length > 0 || removedIds.length > 0,
    };
  }, [selectedIds, currentIds]);

  const toggle = useCallback((clientId: string) => {
    setSelectedIds((current) =>
      current.includes(clientId)
        ? current.filter((id) => id !== clientId)
        : [...current, clientId],
    );
  }, []);

  /** Back to what the program actually holds, not to nobody. */
  const reset = useCallback(() => setSelectedIds(currentIds), [currentIds]);

  const send = useCallback(() => {
    setAssignment(
      { programId: program.id, clientIds: selectedIds, currentIds },
      {
        onSuccess: () => {
          showToast(`${program.name} now with ${clientCount(selectedIds.length)}`, 'success');
          // Back to the program itself: it is where the assignment shows, and
          // where the coach was before this screen.
          router.replace({ pathname: '/programs/[id]', params: { id: program.id } });
        },
        onError: (error) => showToast(errorMessage(error), 'danger'),
      },
    );
  }, [setAssignment, program.id, program.name, selectedIds, currentIds, showToast, router]);

  const confirm = useCallback(() => {
    if (removed.length === 0) {
      send();
      return;
    }

    const names = clients
      .filter((entry) => removed.includes(entry.id))
      .map((entry) => entry.name)
      .join(', ');

    Alert.alert(
      `Take ${program.name} back from ${clientCount(removed.length)}?`,
      `${names} will lose their copy, including any changes they made to it. Workouts they already logged stay.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unassign', style: 'destructive', onPress: send },
      ],
    );
  }, [removed, clients, program.name, send]);

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="gap-4 px-4 pb-8 pt-2"
      keyboardShouldPersistTaps="handled"
    >
      <LICard className="gap-1">
        <LIText
          size="h5"
          color="primary"
          text={program.name}
          numberOfLines={1}
          className="font-geist-semibold"
        />
        <LIText
          size="caption"
          color="muted"
          text={`With ${clientCount(currentIds.length)}. Each one holds their own copy — yours stays as it is, and so does everyone else's.`}
          className="font-geist"
        />
      </LICard>

      {clients.length === 0 ? (
        <LICard>
          <LIText
            size="caption"
            color="muted"
            text="No clients on your roster yet. Invite one from the Roster tab first."
            className="font-geist"
          />
        </LICard>
      ) : (
        <RosterPickList
          clients={clients}
          selectedIds={selectedIds}
          onToggle={toggle}
          onClear={reset}
          label="Who holds this"
        />
      )}

      <View className="gap-2">
        <LIButton
          title={dirty ? 'Save who holds this' : 'No changes'}
          onPress={confirm}
          disabled={!dirty}
          loading={isPending}
          fullWidth
          testID="program-assign-confirm"
        />

        {dirty ? (
          <LIText
            size="caption"
            color={removed.length > 0 ? 'danger' : 'muted'}
            text={[
              added.length > 0 ? `${clientCount(added.length)} added` : null,
              removed.length > 0 ? `${clientCount(removed.length)} removed` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
            className="text-center font-geist-medium"
          />
        ) : (
          <LIText
            size="caption"
            color="muted"
            text="Tick to give someone a copy. Untick to take it back."
            className="text-center font-geist"
          />
        )}
      </View>
    </ScrollView>
  );
}
