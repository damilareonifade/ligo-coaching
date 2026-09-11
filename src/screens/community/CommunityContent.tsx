import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import type { ApiCommunity, ApiCommunityBoardSummary } from '@/api/types';
import { LIText } from '@/components/ui';
import { tokens } from '@/theme/tokens';

import CommunityBoardRow from './CommunityBoardRow';
import CommunityEmptyState from './CommunityEmptyState';
import CommunityGroupRow from './CommunityGroupRow';
import CommunityInviteCard from './CommunityInviteCard';
import CommunitySection from './CommunitySection';

interface CommunityContentProps {
  readonly community: ApiCommunity;
  readonly refreshing: boolean;
  readonly onRefresh: () => void;
}

/**
 * A ScrollView rather than `LIList`: a client belongs to a handful of groups,
 * not a feed, and the three sections would otherwise have to become list
 * headers around a list that is never long enough to need recycling.
 */
export default function CommunityContent({
  community,
  refreshing,
  onRefresh,
}: CommunityContentProps) {
  const router = useRouter();

  const openInvite = useCallback(
    (inviteId: string) => router.push(`/community/invite/${inviteId}`),
    [router],
  );

  const openGroup = useCallback(
    (groupId: string) => router.push(`/community/group/${groupId}`),
    [router],
  );

  // A board you are on opens its ranking; a board you are not on opens the
  // decision, never the ranking. Landing on other people's rows first and
  // being asked to join afterwards gets the order of that exactly backwards.
  const openBoard = useCallback(
    (board: ApiCommunityBoardSummary) =>
      router.push(
        board.optedIn ? `/community/board/${board.id}` : `/community/board/${board.id}/opt-in`,
      ),
    [router],
  );

  const isEmpty =
    community.invites.length === 0 &&
    community.groups.length === 0 &&
    community.boards.length === 0;

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="gap-5 px-4 pb-10 pt-2"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.violet} />
      }
      testID="community-scroll"
    >
      {isEmpty ? <CommunityEmptyState /> : null}

      {community.invites.length > 0 ? (
        <CommunitySection title="Invites">
          <View className="gap-3">
            {community.invites.map((invite) => (
              <CommunityInviteCard key={invite.id} invite={invite} onReview={openInvite} />
            ))}
          </View>
        </CommunitySection>
      ) : null}

      {community.groups.length > 0 ? (
        <CommunitySection title="Groups">
          <View>
            {community.groups.map((group, index) => (
              <CommunityGroupRow
                key={group.id}
                group={group}
                onPress={openGroup}
                first={index === 0}
                last={index === community.groups.length - 1}
              />
            ))}
          </View>
        </CommunitySection>
      ) : null}

      {community.boards.length > 0 ? (
        <CommunitySection title="Leaderboards">
          <View>
            {community.boards.map((board, index) => (
              <CommunityBoardRow
                key={board.id}
                board={board}
                onPress={openBoard}
                first={index === 0}
                last={index === community.boards.length - 1}
              />
            ))}
          </View>
        </CommunitySection>
      ) : null}

      {isEmpty ? null : (
        <LIText
          size="caption"
          color="muted"
          text="You choose how you appear in each of these, separately, and you can leave any of them without it touching your training history."
          className="px-1 font-geist"
        />
      )}
    </ScrollView>
  );
}
