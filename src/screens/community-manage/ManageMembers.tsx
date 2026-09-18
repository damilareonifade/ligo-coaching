import { Crown, UserMinus } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import type { ApiCommunityMember } from '@/api/types';
import { LIAvatar, LIBadge, LIButton, LICard, LIDialog, LIText } from '@/components/ui';
import { useThemeTokens } from '@/theme/tokens';

interface ManageMembersProps {
  readonly members: readonly ApiCommunityMember[];
  /** The reader, so the row that is theirs offers nothing to do to themselves. */
  readonly meId: string;
  readonly isAdmin: boolean;
  readonly onSetAdmin: (userId: string, admin: boolean) => void;
  readonly onRemove: (userId: string) => void;
  readonly busyId?: string;
}

/**
 * Everybody in the group, by the name they chose for it.
 *
 * The header card shows four faces and a count, which answers "how many" and
 * not "who" — and "who" is the question somebody asks before they decide what
 * to say in a group. So this is the whole list, and it is the first thing on
 * the screen.
 *
 * Only an admin sees the actions, and never against their own row: standing
 * yourself down goes through leaving, which is the one path that knows what
 * happens when the last admin goes.
 */
export default function ManageMembers({
  members,
  meId,
  isAdmin,
  onSetAdmin,
  onRemove,
  busyId,
}: ManageMembersProps) {
  const tokens = useThemeTokens();
  const [removing, setRemoving] = useState<ApiCommunityMember | null>(null);

  const confirmRemove = useCallback(() => {
    if (removing) onRemove(removing.clientId);
    setRemoving(null);
  }, [onRemove, removing]);

  return (
    <LICard className="gap-3">
      <LIText
        size="h5"
        color="primary"
        text={`${members.length} members`}
        className="font-geist-semibold"
      />

      <View className="gap-3">
        {members.map((member) => {
          const isMe = member.clientId === meId;
          const busy = busyId === member.clientId;

          return (
            <View key={member.clientId} className="flex-row items-center gap-3">
              <LIAvatar name={member.displayName} size="sm" />

              <View className="min-w-0 flex-1 gap-0.5">
                <LIText
                  size="p"
                  color="primary"
                  text={isMe ? `${member.displayName} (you)` : member.displayName}
                  numberOfLines={1}
                  className="font-geist-medium"
                />
                {/* The one thing a name does not say. A coach badge is about
                    who somebody is; an admin badge is about what they can do
                    here, and only the second is this screen's business. */}
                {member.isAdmin ? (
                  <LIText size="caption" color="accent" text="Admin" className="font-geist-medium" />
                ) : null}
              </View>

              {member.isCoach ? (
                <LIBadge tone="neutral" label="Coach" labelClassName="font-geist-medium" />
              ) : null}

              {isAdmin && !isMe ? (
                <View className="flex-row items-center gap-1">
                  <LIButton
                    title=""
                    onPress={() => onSetAdmin(member.clientId, !member.isAdmin)}
                    variant="ghost"
                    size="sm"
                    loading={busy}
                    icon={
                      <Crown
                        color={member.isAdmin ? tokens.violet : tokens['foreground-subtle']}
                        size={18}
                      />
                    }
                    accessibilityLabel={
                      member.isAdmin
                        ? `Remove admin from ${member.displayName}`
                        : `Make ${member.displayName} an admin`
                    }
                    className="h-9 w-9 gap-0 px-0"
                    testID={`manage-admin-${member.clientId}`}
                  />
                  <LIButton
                    title=""
                    onPress={() => setRemoving(member)}
                    variant="ghost"
                    size="sm"
                    icon={<UserMinus color={tokens.danger} size={18} />}
                    accessibilityLabel={`Remove ${member.displayName} from the group`}
                    className="h-9 w-9 gap-0 px-0"
                    testID={`manage-remove-${member.clientId}`}
                  />
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      <LIDialog
        visible={removing !== null}
        onClose={() => setRemoving(null)}
        title={removing ? `Remove ${removing.displayName}?` : 'Remove them?'}
        testID="manage-remove-dialog"
      >
        <LIText
          size="p"
          color="body"
          // What actually happens, in the same terms `remove_group_member`
          // uses: they are marked as left, and their turns stay.
          text="They stop receiving and sending messages here. What they already said stays in the thread, because a conversation missing half its turns is not one anybody can read."
          className="font-geist"
        />
        <View className="gap-2">
          <LIButton
            title="Remove them"
            onPress={confirmRemove}
            variant="danger"
            size="lg"
            shape="rounded"
            fullWidth
            testID="manage-remove-confirm"
          />
          <LIButton
            title="Keep them"
            onPress={() => setRemoving(null)}
            variant="ghost"
            size="lg"
            shape="rounded"
            fullWidth
          />
        </View>
      </LIDialog>
    </LICard>
  );
}
