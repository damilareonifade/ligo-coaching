import { useCallback } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/api/client';
import { usePublishProgramMutation } from '@/api/coachPrograms';
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

export default function ProgramPublishFooter({ program }: ProgramPublishFooterProps) {
  const showToast = useUiStore((state) => state.showToast);
  const { mutate: publish, isPending } = usePublishProgramMutation();

  const send = useCallback(() => {
    publish(program.id, {
      onError: (error) => showToast(errorMessage(error), 'danger'),
    });
  }, [publish, program.id, showToast]);

  return (
    <View className="gap-2">
      <LIButton
        // Nothing to send is not a failure state, so the button says so in the
        // label rather than sitting there greyed out with no explanation.
        title={program.hasDraftChanges ? publishTitle(program.assignedIds.length) : 'Published'}
        onPress={send}
        disabled={!program.hasDraftChanges}
        loading={isPending}
        fullWidth
        testID="program-publish"
      />
      <LIText
        size="caption"
        color="muted"
        text="Clients keep published programs if they detach."
        className="text-center font-geist"
      />
    </View>
  );
}
