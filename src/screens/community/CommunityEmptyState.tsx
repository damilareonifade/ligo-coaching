import { View } from 'react-native';

import { LIText } from '@/components/ui';

/**
 * An empty Community screen is not a state to fix. Every other empty state in
 * the app has an action attached because the thing missing is something the
 * client wanted; this one has none, because a client with no groups has not
 * failed to do anything — they simply have not been asked, or were asked and
 * said no, and both are fine.
 */
export default function CommunityEmptyState() {
  return (
    <View className="gap-2 rounded-card bg-white p-6">
      <LIText
        size="h4"
        color="primary"
        text="Nothing here, and nothing missing"
        className="font-geist-semibold"
      />
      <LIText
        size="p"
        color="muted"
        text="Groups and leaderboards exist only if a coach invites you and you say yes. Training without them is the same app, with fewer people in it."
        className="font-geist"
      />
    </View>
  );
}
