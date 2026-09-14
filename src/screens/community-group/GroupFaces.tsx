import { View } from 'react-native';

import type { ApiCommunityMember } from '@/api/types';
import { LIAvatar, LIText } from '@/components/ui';

const MAX_FACES = 4;

interface GroupFacesProps {
  readonly members: readonly ApiCommunityMember[];
}

/**
 * Four faces and a count. Every face here is a display name's initials, so a
 * member who chose a handle shows that handle's letters — there is no path by
 * which a real name reaches this row.
 */
export default function GroupFaces({ members }: GroupFacesProps) {
  const shown = members.slice(0, MAX_FACES);
  const rest = members.length - shown.length;

  return (
    <View className="flex-row items-center">
      {shown.map((member, index) => (
        <View key={member.clientId} className={index === 0 ? undefined : '-ml-3'}>
          <LIAvatar
            name={member.displayName}
            size="sm"
            className="border-2 border-surface"
            labelClassName="font-geist-semibold"
          />
        </View>
      ))}

      {rest > 0 ? (
        <View className="-ml-3 h-9 w-9 items-center justify-center rounded-pill border-2 border-surface bg-surface-sunken">
          <LIText
            size="caption"
            color="muted"
            text={`+${rest}`}
            className="font-geist-semibold"
          />
        </View>
      ) : null}
    </View>
  );
}
