import { View } from 'react-native';

import { LIText } from '@/components/ui';

interface NotificationsNoteProps {
  readonly isCoach: boolean;
}

/**
 * The promise the feed exists to keep, said at the foot of the list rather
 * than in a dialog: it is read once, and every access row above it is the
 * evidence.
 *
 * The promise is the same fact from either side — nothing about access happens
 * quietly — but it is not the same reassurance. A coach needs to know they
 * will not lose a view without being told; a client needs to know nothing is
 * taken without them agreeing to it.
 */
export default function NotificationsNote({ isCoach }: NotificationsNoteProps) {
  return (
    <View className="pt-5">
      <LIText
        size="caption"
        color="muted"
        text={
          isCoach
            ? 'Permission changes are always announced. You never lose access silently.'
            : 'Your coach can only ask. Nothing opens up until you say yes, and you can close it again here.'
        }
        className="px-1 font-geist"
      />
    </View>
  );
}
