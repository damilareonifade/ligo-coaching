import { useCallback } from 'react';
import { View } from 'react-native';

import type { ApiSettingsGroup, ApiSettingsRow } from '@/api/types';
import { LICard, LIText } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';

import ProfileRow from '@/components/profile/ProfileRow';
import { useRowAction } from '@/components/profile/useRowAction';

/** The one row that does something irreversible on tap rather than navigating. */
const SIGN_OUT_ROW_ID = 'sign-out';

interface ProfileSettingsGroupsProps {
  readonly groups: readonly ApiSettingsGroup[];
}

export default function ProfileSettingsGroups({ groups }: ProfileSettingsGroupsProps) {
  const handleRow = useRowAction();
  const signOut = useAuthStore((state) => state.signOut);

  const press = useCallback(
    (row: ApiSettingsRow) => {
      if (row.id === SIGN_OUT_ROW_ID) {
        void signOut();
        return;
      }
      handleRow(row);
    },
    [handleRow, signOut],
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
                onPress={() => press(row)}
              />
            ))}
          </LICard>
        </View>
      ))}
    </>
  );
}
