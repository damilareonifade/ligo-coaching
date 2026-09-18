import { useCallback } from 'react';
import { View } from 'react-native';

import type { ApiCommunityInvite } from '@/api/types';
import { LIAvatar, LIButton, LIText } from '@/components/ui';

interface CommunityInviteCardProps {
  readonly invite: ApiCommunityInvite;
  readonly onReview: (inviteId: string) => void;
}

/**
 * An invitation, and nothing that looks like a yes.
 *
 * There is no Accept on this card on purpose. Accepting is a decision about
 * what other people will be able to see, and it is not one anyone should be
 * able to make from a list, in a scroll, without having read what it grants.
 * The only action is Review, and the consent screen is where the answer lives.
 */
export default function CommunityInviteCard({ invite, onReview }: CommunityInviteCardProps) {
  const review = useCallback(() => onReview(invite.id), [onReview, invite.id]);

  return (
    <View className="gap-3 rounded-card border border-violet-line bg-violet-weak/40 p-4">
      <View className="flex-row items-center gap-3">
        <LIAvatar name={invite.ownerName} size="sm" className="bg-surface" />
        <View className="flex-1 gap-0.5">
          <LIText size="h5" color="primary" text={invite.name} className="font-geist-semibold" />
          <LIText
            size="caption"
            color="muted"
            text={invite.kind === 'group' ? 'Group chat' : 'Leaderboard'}
            className="font-geist"
          />
        </View>
      </View>

      <LIText size="p" color="body" text={invite.summary} className="font-geist" />

      <LIButton
        title="Review"
        variant="outline"
        fullWidth
        shape="rounded"
        onPress={review}
        testID={`invite-review-${invite.id}`}
      />
    </View>
  );
}
