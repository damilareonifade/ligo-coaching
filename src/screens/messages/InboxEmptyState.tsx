import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

import { LIButton, LIText } from '@/components/ui';

interface InboxEmptyStateProps {
  readonly isClient: boolean;
}

/**
 * No conversations at all, which is a beginning rather than a problem — so it
 * points somewhere rather than apologising.
 *
 * Where it points depends on who is reading, and the two are not versions of
 * one sentence. A coach with an empty inbox has a roster, and everybody on it
 * can already write to them.
 *
 * A client with an empty one has no coach: attaching to one creates the thread
 * (`sync_direct_thread`), so a client who has a coach is never here. That
 * makes attaching the only thing this screen can usefully offer — and
 * `?direct=1` is how the rest of the app enters that flow from outside
 * onboarding, which is where a client already attaches from Profile and Today.
 */
export default function InboxEmptyState({ isClient }: InboxEmptyStateProps) {
  const router = useRouter();
  const openRoster = useCallback(() => router.push('/roster'), [router]);
  const attachCoach = useCallback(
    () => router.push('/onboarding/attach-coach?direct=1'),
    [router],
  );

  return (
    <View className="mt-2 items-center gap-3 rounded-card border border-dashed border-border-strong px-6 py-10">
      <LIText
        size="p"
        color="primary"
        text="No conversations yet."
        className="text-center font-geist-medium"
      />
      <LIText
        size="caption"
        color="muted"
        // Not an apology. Training on your own is a whole way to use this app,
        // and a group you join shows up here without a coach anywhere in it.
        text={
          isClient
            ? 'Attach a coach and you can message them, whatever else you choose to share. Groups you join appear here too.'
            : 'Every client on your roster can message you, and you can message them — whatever else they have chosen to share.'
        }
        className="text-center font-geist"
      />
      <LIButton
        title={isClient ? 'Find a coach' : 'Open your roster'}
        onPress={isClient ? attachCoach : openRoster}
        variant="outline"
        size="sm"
        testID={isClient ? 'inbox-attach-coach' : 'inbox-open-roster'}
      />
    </View>
  );
}
