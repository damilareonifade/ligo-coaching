import { View } from 'react-native';

import { LIText } from '@/components/ui';

interface CommunityEyebrowProps {
  /** Upper-cased on screen — "COMMUNITY VISIBILITY", "PER LEADERBOARD". */
  readonly label: string;
  /** The state, right-aligned — "Off by default", "Invites only". */
  readonly note: string;
}

/**
 * The line above every community screen that asks for something. It states the
 * default before the screen states the offer, so the answer already on the
 * table is visible before the question is read — "Off by default" is a fact
 * about the app, not reassurance about this particular decision.
 */
export default function CommunityEyebrow({ label, note }: CommunityEyebrowProps) {
  return (
    <View className="flex-row items-center gap-2">
      <View className="h-1.5 w-1.5 rounded-pill bg-violet" />
      <LIText
        size="caption"
        color="accent"
        text={label.toUpperCase()}
        className="font-geist-medium tracking-wide"
      />
      <View className="flex-1" />
      <LIText size="caption" color="muted" text={note} className="font-geist" />
    </View>
  );
}
