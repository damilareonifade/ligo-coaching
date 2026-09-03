import { useRouter } from 'expo-router';
import { View } from 'react-native';

import type { ApiClientSession } from '@/api/types';
import { LICard, LIText } from '@/components/ui';
import { useElapsedMs } from '@/hooks/useElapsedMs';
import { formatElapsed } from '@/lib/format';
import { countSets } from '@/lib/session';
import { useClientSessionStore } from '@/store/clientSessionStore';

interface TrainResumeBannerProps {
  readonly session: ApiClientSession | null;
}

/**
 * A workout left running is the single most important thing on this screen,
 * so it sits above Next up and says how far in they already are.
 */
export default function TrainResumeBanner({ session }: TrainResumeBannerProps) {
  const router = useRouter();
  const sessionId = useClientSessionStore((state) => state.sessionId);
  const startedAtMs = useClientSessionStore((state) => state.startedAtMs);
  const draft = useClientSessionStore((state) => state.sets);
  const elapsedMs = useElapsedMs(startedAtMs);

  if (!sessionId || !session) return null;

  const { completed, total } = countSets(session.exercises, draft);

  return (
    <LICard
      className="flex-row items-center gap-3 border border-violet-line"
      onPress={() => router.push(`/session/${sessionId}`)}
      testID="train-resume-banner"
    >
      <View className="h-2 w-2 rounded-pill bg-violet" />

      <View className="flex-1 gap-0.5">
        <LIText
          size="h5"
          color="primary"
          text={`${session.title} in progress`}
          numberOfLines={1}
          className="font-geist-semibold"
        />
        <LIText
          size="caption"
          color="muted"
          text={`${formatElapsed(elapsedMs)} elapsed · ${completed} of ${total} sets done`}
          className="font-geist-medium"
        />
      </View>

      <LIText size="caption" color="accent" text="Resume" className="font-geist-semibold" />
    </LICard>
  );
}
