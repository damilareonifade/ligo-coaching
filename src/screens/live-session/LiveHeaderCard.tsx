import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { LICard, LIText } from '@/components/ui';
import { liveBannerText } from '@/lib/clientReview';
import { liveHeaderLine } from '@/lib/liveSession';
import { tokens } from '@/theme/tokens';

interface LiveHeaderCardProps {
  readonly clientName: string;
  readonly title: string;
  readonly elapsedMs: number;
}

const DOT_SIZE = 8;

function LiveDot() {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) return;
    opacity.value = withRepeat(withTiming(0.3, { duration: 700 }), -1, true);
  }, [opacity, reducedMotion]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          width: DOT_SIZE,
          height: DOT_SIZE,
          borderRadius: DOT_SIZE / 2,
          backgroundColor: tokens.violet,
        },
        style,
      ]}
    />
  );
}

/**
 * The clock. It ticks off `startedAt` rather than off a duration the server
 * composed, so a coach who leaves this screen open watches real time pass
 * instead of a number frozen at whatever it was when the payload landed —
 * which on a screen that promises live sets would be the wrong kind of quiet.
 */
export default function LiveHeaderCard({
  clientName,
  title,
  elapsedMs,
}: LiveHeaderCardProps) {
  return (
    <LICard className="gap-2 border border-violet-line" testID="live-header">
      <View className="flex-row items-center gap-2">
        <LiveDot />
        <LIText
          size="h5"
          color="accent"
          text={liveBannerText(clientName)}
          className="font-geist-semibold"
        />
      </View>
      <LIText
        size="caption"
        color="muted"
        text={liveHeaderLine(title, elapsedMs)}
        className="font-geist"
        testID="live-elapsed"
      />
    </LICard>
  );
}
