import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { useJoinBoardMutation } from '@/api/community';
import type { ApiCommunityBoard, CommunityIdentity } from '@/api/types';
import { LIButton, LICheckbox, LIText } from '@/components/ui';
import {
  BOARD_CONSENT_LABEL,
  BOARD_SHARE_NOTE,
  boardInviteLine,
  identityOptions,
  isIdentityReady,
  resolveDisplayName,
} from '@/lib/community';
import CommunityEyebrow from '@/components/community/CommunityEyebrow';
import { useUiStore } from '@/store/uiStore';

import BoardFactsGrid from './BoardFactsGrid';
import IdentityChoiceList from './IdentityChoiceList';

interface OptInContentProps {
  readonly board: ApiCommunityBoard;
  /** The name on the client's profile — what the `real` option would show. */
  readonly realName: string;
}

/**
 * The one screen that puts a client onto a leaderboard, and the only one.
 *
 * Three things are true here and each has a control of its own: what the board
 * measures (the facts), what name will carry it (the identity list), and
 * whether the client agrees to be ranked at all (the checkbox). They are not
 * collapsed into one button, because they are not one decision — someone can
 * be happy to be measured and unwilling to be named, and the screen has to be
 * able to hear that.
 */
export default function OptInContent({ board, realName }: OptInContentProps) {
  const router = useRouter();
  const showToast = useUiStore((state) => state.showToast);
  const join = useJoinBoardMutation();

  const [identity, setIdentity] = useState<CommunityIdentity>(board.myIdentity);
  const [handle, setHandle] = useState('');
  const [consented, setConsented] = useState(false);

  const options = useMemo(() => identityOptions(realName), [realName]);
  const preview = resolveDisplayName(identity, realName, handle);
  const invitedCount = board.rows.length + board.invitedNotOptedIn;

  // The checkbox is the gate. The handle check rides alongside it because a
  // board row with an empty name is not a thing anyone consented to either.
  const canJoin = consented && isIdentityReady(identity, handle);

  const handleJoin = useCallback(() => {
    join.mutate(
      { boardId: board.id, identity, handle },
      {
        onSuccess: () => router.replace(`/community/board/${board.id}`),
        onError: (error: unknown) => showToast(errorMessage(error), 'danger'),
      },
    );
  }, [board.id, handle, identity, join, router, showToast]);

  const handleDecline = useCallback(() => {
    router.replace('/community');
    showToast('Not joined. Nothing of yours is on that board, and nobody there was told.', 'info');
  }, [router, showToast]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-4 pb-10 pt-3"
        keyboardShouldPersistTaps="handled"
      >
        <CommunityEyebrow label="Per leaderboard" note="Not on it yet" />

        <View className="gap-4 rounded-card border border-violet-line bg-violet-weak/40 p-4">
          <View className="gap-1">
            <LIText size="h3" color="primary" text={board.name} className="font-geist-semibold" />
            <LIText
              size="p"
              color="body"
              text={boardInviteLine(board.coachName, invitedCount)}
              className="font-geist"
            />
          </View>

          <BoardFactsGrid facts={board.facts} />

          <IdentityChoiceList
            options={options}
            value={identity}
            onChange={setIdentity}
            handle={handle}
            onHandleChange={setHandle}
          />

          <View className="flex-row items-center gap-3 rounded-card bg-surface px-4 py-3">
            <LIText
              size="caption"
              color="muted"
              text="You will appear as"
              className="font-geist"
            />
            <View className="flex-1" />
            <LIText
              size="p"
              color={preview.length > 0 ? 'accent' : 'muted'}
              text={preview.length > 0 ? preview : 'Pick a handle first'}
              numberOfLines={1}
              className="font-geist-semibold"
              testID="optin-preview"
            />
          </View>

          <View className="flex-row items-start gap-3">
            <LICheckbox
              checked={consented}
              onChange={setConsented}
              accessibilityLabel={BOARD_CONSENT_LABEL}
              testID="optin-consent"
            />
            <LIText
              size="p"
              color="body"
              text={BOARD_CONSENT_LABEL}
              className="flex-1 font-geist"
              handleClick={() => setConsented(!consented)}
            />
          </View>

          <View className="gap-2">
            <LIButton
              title="Join leaderboard"
              fullWidth
              size="lg"
              shape="rounded"
              disabled={!canJoin}
              loading={join.isPending}
              onPress={handleJoin}
              testID="optin-join"
            />
            <LIButton
              title="Decline"
              variant="ghost"
              fullWidth
              size="lg"
              shape="rounded"
              disabled={join.isPending}
              onPress={handleDecline}
              testID="optin-decline"
            />
          </View>
        </View>

        <LIText size="caption" color="muted" text={BOARD_SHARE_NOTE} className="px-1 font-geist" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
