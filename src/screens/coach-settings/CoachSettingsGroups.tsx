import { useCallback } from 'react';
import { View } from 'react-native';

import type { ApiSettingsGroup, ApiSettingsRow } from '@/api/types';
import { LICard, LIText } from '@/components/ui';
import ProfileRow from '@/screens/profile/ProfileRow';
import { useRowAction } from '@/screens/profile/useRowAction';

interface CoachSettingsGroupsProps {
  readonly groups: readonly ApiSettingsGroup[];
  readonly onSignOut: () => void;
  readonly onCopyInviteCode: () => void;
}

const SIGN_OUT_ROW_ID = 'sign-out';
const INVITE_CODE_ROW_ID = 'invite-code';

/**
 * The settings list, reusing the client's `ProfileRow` and `useRowAction`.
 *
 * `ProfileRow` fits without a change: label over description, value on the
 * right, chevron, and a `danger` colour for the row that ends something —
 * which is exactly the anatomy the coach's rows need, down to Sign out being
 * the same kind of row as Detach coach. Sharing it also means a later tweak to
 * row spacing lands on both sides of the app rather than on one.
 *
 * Two rows are not navigation and so are intercepted here rather than pushed
 * through `useRowAction`: Sign out ends the session, and the invite code
 * duplicates the hero card's copy action for the coach who looks for it in the
 * list. Everything else either has a `route` or falls through to the shared
 * "not connected yet" toast — which is what Profile and Billing do today.
 */
export default function CoachSettingsGroups({
  groups,
  onSignOut,
  onCopyInviteCode,
}: CoachSettingsGroupsProps) {
  const handleRow = useRowAction();

  const pressRow = useCallback(
    (row: ApiSettingsRow) => {
      if (row.id === SIGN_OUT_ROW_ID) {
        onSignOut();
        return;
      }
      if (row.id === INVITE_CODE_ROW_ID) {
        onCopyInviteCode();
        return;
      }
      handleRow(row);
    },
    [handleRow, onCopyInviteCode, onSignOut],
  );

  return (
    <>
      {groups.map((group) => (
        <View key={group.id} className="gap-2">
          <LIText
            size="caption"
            color="muted"
            text={group.title}
            className="px-1 font-geist-medium"
          />
          <LICard className="py-1">
            {group.rows.map((row, index) => (
              <ProfileRow
                key={row.id}
                row={row}
                divided={index > 0}
                onPress={() => pressRow(row)}
              />
            ))}
          </LICard>
        </View>
      ))}
    </>
  );
}
