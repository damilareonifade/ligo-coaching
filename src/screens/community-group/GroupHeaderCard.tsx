import { View } from 'react-native';

import type { ApiCommunityMember } from '@/api/types';
import { LICard, LIText } from '@/components/ui';

import GroupFaces from './GroupFaces';

interface GroupHeaderCardProps {
  readonly members: readonly ApiCommunityMember[];
  /** Opens the members-and-rankings screen. */
  readonly onManage?: () => void;
  /** Already worded for the seat reading it — see `GroupContent`. */
  readonly context: string;
}

/**
 * Who is in here and how you appear to them, in that order.
 *
 * The identity line is the second thing on the card rather than buried in a
 * settings screen: a client scrolling their own group should never have to go
 * looking for the answer to "wait, what name are they seeing?".
 */
export default function GroupHeaderCard({
  members,
  context,
  onManage,
}: GroupHeaderCardProps) {
  return (
    <LICard className="gap-3">
      <View className="flex-row items-center gap-3">
        <GroupFaces members={members} />

        <View className="flex-1 gap-0.5">
          {/* The count is the way in to the list. "How many" is the question
              the faces answer; "who" is the one people actually ask, and it
              needs somewhere to go. */}
          <LIText
            size="h5"
            color={onManage ? 'accent' : 'primary'}
            text={`${members.length} members`}
            handleClick={onManage}
            className="font-geist-semibold"
            testID="group-manage"
          />
          <LIText size="caption" color="muted" text={context} className="font-geist" />
        </View>
      </View>
    </LICard>
  );
}
