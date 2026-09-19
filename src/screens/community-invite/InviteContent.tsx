import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { useAcceptInviteMutation, useDeclineInviteMutation } from '@/api/community';
import type { ApiCommunityInvite, CommunityIdentity } from '@/api/types';
import { LIAvatar, LIButton, LIText } from '@/components/ui';
import {
  declineNote,
  identityOptions,
  isIdentityReady,
  resolveDisplayName,
} from '@/lib/community';
import CommunityEyebrow from '@/components/community/CommunityEyebrow';
import IdentityChoiceList from '@/components/community/IdentityChoiceList';
import { useUiStore } from '@/store/uiStore';

import InviteVisibilityPanel from './InviteVisibilityPanel';

interface InviteContentProps {
  readonly invite: ApiCommunityInvite;
  /**
   * The name on their profile, for the "Real name" option to show rather than
   * describe — the same reason the board opt-in takes it.
   */
  readonly realName: string;
  /** Lets the screen stop rendering the invite once it has been answered. */
  readonly onAnswered: () => void;
}

/**
 * The consent screen. It is the only place an invitation can be accepted, and
 * the two buttons are deliberately not weighted against each other beyond the
 * usual primary/outline pair — a decline is an answer, not a mistake to be
 * discouraged with a smaller target or a quieter colour.
 *
 * Accepting a group invitation also picks how you appear in it. That used to
 * be sent as `'first'` on everybody's behalf, which was the app answering a
 * privacy question nobody was asked — and answering it permanently, because
 * nothing updates a group identity after it is written. A board invitation
 * still leads to its own opt-in, which asks there against that board's facts,
 * so this screen does not ask twice.
 */
export default function InviteContent({ invite, realName, onAnswered }: InviteContentProps) {
  const router = useRouter();
  const showToast = useUiStore((state) => state.showToast);
  const accept = useAcceptInviteMutation();
  const decline = useDeclineInviteMutation();

  const isGroup = invite.kind === 'group';
  const [identity, setIdentity] = useState<CommunityIdentity>('first');
  const [handle, setHandle] = useState('');

  const options = useMemo(() => identityOptions(realName), [realName]);
  const preview = resolveDisplayName(identity, realName, handle);

  const handleAccept = useCallback(() => {
    accept.mutate(
      { inviteId: invite.id, identity, handle },
      {
        onSuccess: () => {
          onAnswered();
          // A board still owes the client an identity choice before any row of
          // theirs exists, so accepting an invitation to one leads to the
          // opt-in, never straight onto the ranking.
          router.replace(
            isGroup
              ? `/community/group/${invite.targetId}`
              : `/community/board/${invite.targetId}/opt-in`,
          );
        },
        onError: (error: unknown) => showToast(errorMessage(error), 'danger'),
      },
    );
  }, [accept, handle, identity, invite.id, invite.targetId, isGroup, onAnswered, router, showToast]);

  const handleDecline = useCallback(() => {
    decline.mutate(invite.id, {
      onSuccess: () => {
        onAnswered();
        router.replace('/community');
        // Said on the way out, because it is the thing a client hesitating
        // over Decline actually wants to know: the coach learns who accepted,
        // and a decline leaves no note behind for them to read.
        showToast(declineNote(invite.ownerName), 'info');
      },
      onError: (error: unknown) => showToast(errorMessage(error), 'danger'),
    });
  }, [decline, invite.id, invite.ownerName, onAnswered, router, showToast]);

  const busy = accept.isPending || decline.isPending;
  // A handle nobody typed would put an empty name in the members list, which
  // is not something anybody consented to either.
  const ready = !isGroup || isIdentityReady(identity, handle);

  return (
    <ScrollView className="flex-1" contentContainerClassName="gap-5 px-4 pb-10 pt-3">
      <CommunityEyebrow label="Community visibility" note="Off by default" />

      <View className="gap-3 rounded-card border border-violet-line bg-violet-weak/40 p-4">
        <View className="flex-row items-center gap-3">
          <LIAvatar name={invite.ownerName} size="md" className="bg-surface" />
          <View className="flex-1 gap-0.5">
            <LIText size="h4" color="primary" text={invite.name} className="font-geist-semibold" />
            <LIText
              size="caption"
              color="muted"
              text={invite.kind === 'group' ? 'Group chat' : 'Leaderboard'}
              className="font-geist"
            />
          </View>
        </View>

        <LIText size="p" color="body" text={invite.summary} className="font-geist" />
      </View>

      <InviteVisibilityPanel visible={invite.visible} hidden={invite.hidden} />

      {isGroup ? (
        <View className="gap-2">
          <IdentityChoiceList
            options={options}
            value={identity}
            onChange={setIdentity}
            handle={handle}
            onHandleChange={setHandle}
          />
          <LIText
            size="caption"
            color="muted"
            text={
              preview.length > 0
                ? `The ${invite.name} members will see you as ${preview}.`
                : 'Type the handle you want the members to see.'
            }
            className="px-1 font-geist"
          />
        </View>
      ) : null}

      <View className="gap-2">
        <LIButton
          title="Accept and join"
          fullWidth
          size="lg"
          shape="rounded"
          loading={accept.isPending}
          disabled={busy || !ready}
          onPress={handleAccept}
          testID="invite-accept"
        />
        <LIButton
          title="Decline"
          variant="outline"
          fullWidth
          size="lg"
          shape="rounded"
          loading={decline.isPending}
          disabled={busy}
          onPress={handleDecline}
          testID="invite-decline"
        />
      </View>

      <LIText
        size="caption"
        color="muted"
        text={`${invite.ownerName} is told who accepted. Nobody is told who declined, or why.`}
        className="px-1 font-geist"
      />
    </ScrollView>
  );
}
