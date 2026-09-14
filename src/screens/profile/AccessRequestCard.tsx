import { View } from 'react-native';

import type { ApiAccessRequest } from '@/api/types';
import { LIButton, LIText } from '@/components/ui';

interface AccessRequestCardProps {
  readonly request: ApiAccessRequest;
  readonly onAnswer: (requestId: string, grant: boolean) => void;
  readonly answering: boolean;
}

/**
 * One question, and two answers of equal weight.
 *
 * "Not now" is not a ghost button and is not tucked under anything. A card
 * whose refusal is harder to find than its agreement is not asking, and this
 * one has to be asking — the client has already been told, on the screen where
 * they attached, that everything is off until they turn it on.
 *
 * There is no third option. Leaving a question unanswered would leave the
 * coach waiting indefinitely, and the client with a card they have to keep
 * scrolling past.
 */
export default function AccessRequestCard({
  request,
  onAnswer,
  answering,
}: AccessRequestCardProps) {
  return (
    <View
      className="gap-3 rounded-card border border-violet-line bg-violet-weak p-4"
      testID={`access-request-${request.domain}`}
    >
      <View className="gap-1">
        <LIText
          size="caption"
          color="muted"
          text={`Asked ${request.when} ago`}
          className="font-geist"
        />
        <LIText
          size="h5"
          color="primary"
          text={request.title}
          className="font-geist-semibold text-foreground"
        />
        <LIText size="p" color="body" text={request.body} className="font-geist" />
      </View>

      <View className="flex-row gap-3">
        <LIButton
          title="Not now"
          onPress={() => onAnswer(request.id, false)}
          disabled={answering}
          variant="outline"
          className="flex-1 border-violet-line bg-surface"
          labelClassName="text-foreground-muted"
          testID={`access-decline-${request.domain}`}
        />
        <LIButton
          title="Share it"
          onPress={() => onAnswer(request.id, true)}
          loading={answering}
          className="flex-1 bg-violet active:bg-violet/90"
          testID={`access-grant-${request.domain}`}
        />
      </View>
    </View>
  );
}
