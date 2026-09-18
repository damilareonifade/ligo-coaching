import { View } from 'react-native';

import { LIText } from '@/components/ui';

/**
 * The rule behind every "Messaging only" caption above it: permissions govern
 * data, never the conversation. Said once, at the foot of the list.
 */
interface InboxNoteProps {
  readonly isClient: boolean;
}

export default function InboxNote({ isClient }: InboxNoteProps) {
  return (
    <View className="pt-5">
      <LIText
        size="caption"
        color="muted"
        text={
          isClient
            ? 'Messaging works regardless of permissions. Sharing nothing with your coach still leaves you able to talk to them.'
            : 'Messaging works regardless of permissions. A client who shares nothing can still talk to you.'
        }
        className="px-1 font-geist"
      />
    </View>
  );
}
