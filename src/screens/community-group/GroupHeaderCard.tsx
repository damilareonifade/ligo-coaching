import { View } from 'react-native';

import type { ApiCommunityMember } from '@/api/types';
import { LICard, LIText } from '@/components/ui';

import GroupFaces from './GroupFaces';

interface GroupHeaderCardProps {
  readonly members: readonly ApiCommunityMember[];
  /** Already worded for the seat reading it — see `GroupContent`. */
  readonly context: string;
  /** Omitted for the coach, who runs the group rather than belongs to it. */
  readonly onLeave?: () => void;
}

/**
 * Who is in here and how you appear to them, in that order.
 *
 * The identity line is the second thing on the card rather than buried in a
 * settings screen: a client scrolling their own group should never have to go
 * looking for the answer to "wait, what name are they seeing?".
 */
export default function GroupHeaderCard({ members, context, onLeave }: GroupHeaderCardProps) {
  return (
    <LICard className="gap-3">
      <View className="flex-row items-center gap-3">
        <GroupFaces members={members} />

        <View className="flex-1 gap-0.5">
          <LIText
            size="h5"
            color="primary"
            text={`${members.length} members`}
            className="font-geist-semibold"
          />
          <LIText size="caption" color="muted" text={context} className="font-geist" />
        </View>

        {onLeave ? (
          <LIText
            size="caption"
            color="danger"
            text="Leave"
            className="font-geist-medium"
            handleClick={onLeave}
            testID="group-leave"
          />
        ) : null}
      </View>
    </LICard>
  );
}
