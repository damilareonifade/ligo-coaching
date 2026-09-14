import { useCallback } from 'react';
import { Alert, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { usePublishImpactQuery, usePublishProgramMutation } from '@/api/coachPrograms';
import type { ApiProgramDetail } from '@/api/types';
import { LIButton, LIText } from '@/components/ui';
import { useUiStore } from '@/store/uiStore';

interface ProgramPublishFooterProps {
  readonly program: ApiProgramDetail;
}

/** "Publish to 0 clients" is not a sentence — an unassigned program just publishes. */
function publishTitle(count: number): string {
  if (count === 0) return 'Publish';
  return `Publish to ${count} ${count === 1 ? 'client' : 'clients'}`;
}

/** Plain account of who is about to be asked, and who has work at stake. */
function impactBody(holders: number, changed: number): string {
  if (holders === 0) return 'Nobody holds this yet, so there is nobody to ask.';

  const who = `${holders} ${holders === 1 ? 'client' : 'clients'}`;
  const asked = `${who} will be asked to take this update. Their routines do not change until they accept.`;

  if (changed === 0) return asked;
  return `${asked}\n\n${changed} of them ${changed === 1 ? 'has' : 'have'} changed their own copy, so this may clash with their work.`;
}

export default function ProgramPublishFooter({ program }: ProgramPublishFooterProps) {
  const showToast = useUiStore((state) => state.showToast);
  const { mutate: publish, isPending } = usePublishProgramMutation();
  // Fetched only while there is something to publish — no point costing a
  // request for a button that is disabled.
  const impactQuery = usePublishImpactQuery(program.id, program.hasDraftChanges);

  const send = useCallback(() => {
    publish(program.id, {
      onError: (error) => showToast(errorMessage(error), 'danger'),
    });
  }, [publish, program.id, showToast]);

  /**
   * Gate one. Publishing asks every holder rather than overwriting them, so
   * this is not a warning — it is the coach seeing what they are about to set
   * in motion, including whose work it may collide with.
   */
  const confirm = useCallback(() => {
    const holders = impactQuery.data?.holders ?? program.assignedIds.length;
    const changed = impactQuery.data?.changed ?? 0;

    Alert.alert(`Publish ${program.name}?`, impactBody(holders, changed), [
      { text: 'Cancel', style: 'cancel' },
      { text: holders === 0 ? 'Publish' : 'Send to clients', onPress: send },
    ]);
  }, [impactQuery.data, program.assignedIds.length, program.name, send]);

  return (
    <View className="gap-2">
      <LIButton
        // Nothing to send is not a failure state, so the button says so in the
        // label rather than sitting there greyed out with no explanation.
        title={program.hasDraftChanges ? publishTitle(program.assignedIds.length) : 'Published'}
        onPress={confirm}
        disabled={!program.hasDraftChanges}
        loading={isPending}
        fullWidth
        testID="program-publish"
      />
      <LIText
        size="caption"
        color="muted"
        text="Each client is asked before their copy changes. Clients keep published programs if they detach."
        className="text-center font-geist"
      />
    </View>
  );
}
