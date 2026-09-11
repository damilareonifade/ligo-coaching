import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useCallback, useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { LIText } from '@/components/ui';
import { liveBannerText } from '@/lib/clientReview';
import { tokens } from '@/theme/tokens';

interface ReviewLiveBannerProps {
  readonly clientId: string;
  readonly name: string;
}

const DOT_SIZE = 8;

/**
 * The pulse. It runs on the UI thread so it keeps beating while the review
 * below is still parsing, and it stops entirely under Reduce Motion — a dot
 * that throbs is decoration, and the sentence beside it carries the meaning
 * either way.
 */
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
 * The way into the live session, and only when there is one.
 *
 * It says what is happening rather than inviting the coach to do something —
 * "Maya is training now", not "Watch Maya". The distinction matters on a
 * screen whose whole subject is what a coach is and is not entitled to: they
 * are being told a fact about their client's day, and following it is their
 * choice, not a prompt.
 */
export default function ReviewLiveBanner({ clientId, name }: ReviewLiveBannerProps) {
  const router = useRouter();

  const openLive = useCallback(
    () => router.push(`/student/${clientId}/live`),
    [clientId, router],
  );

  return (
    <Pressable
      onPress={openLive}
      accessibilityRole="button"
      accessibilityLabel={liveBannerText(name)}
      className="flex-row items-center gap-3 rounded-card border border-violet-line bg-violet-weak px-4 py-3 active:opacity-80"
      testID="review-live-banner"
    >
      <LiveDot />
      <View className="flex-1">
        <LIText
          size="p"
          color="accent"
          text={liveBannerText(name)}
          className="font-geist-medium"
        />
      </View>
      <ChevronRight color={tokens.violet} size={18} />
    </Pressable>
  );
}
