import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/api/client';
import { useAnswerAccessRequestMutation } from '@/api/clientProfile';
import type { ApiAccessRequest } from '@/api/types';
import { LIText } from '@/components/ui';
import { useUiStore } from '@/store/uiStore';

import AccessRequestCard from './AccessRequestCard';

interface AccessRequestListProps {
  readonly requests: readonly ApiAccessRequest[];
}

/**
 * Above the coach section, not inside it.
 *
 * A question about what someone can see is not a setting — it is addressed to
 * the client and waiting on them, so it sits where they will meet it rather
 * than behind a row they have no reason to open. With nothing pending it
 * renders nothing at all: a permanent "no requests" panel would be a shape
 * this screen does not need.
 */
export default function AccessRequestList({ requests }: AccessRequestListProps) {
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const showToast = useUiStore((state) => state.showToast);
  const answer = useAnswerAccessRequestMutation();

  const handleAnswer = useCallback(
    (requestId: string, grant: boolean) => {
      setAnsweringId(requestId);
      answer.mutate(
        { requestId, grant },
        {
          onSuccess: () =>
            showToast(grant ? 'Shared' : 'Left as it was', grant ? 'success' : 'info'),
          onError: (error) => showToast(errorMessage(error), 'danger'),
          onSettled: () => setAnsweringId(null),
        },
      );
    },
    [answer, showToast],
  );

  if (requests.length === 0) return null;

  return (
    <View className="gap-3" testID="access-requests">
      <LIText
        size="caption"
        color="muted"
        text={requests.length === 1 ? 'WAITING ON YOU' : `WAITING ON YOU · ${requests.length}`}
        className="font-geist-medium tracking-wide"
      />
      {requests.map((request) => (
        <AccessRequestCard
          key={request.id}
          request={request}
          onAnswer={handleAnswer}
          answering={answeringId === request.id}
        />
      ))}
    </View>
  );
}
