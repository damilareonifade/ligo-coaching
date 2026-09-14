import { useRouter } from 'expo-router';
import { View } from 'react-native';

import type { ApiClientSession } from '@/api/types';
import { LICard, LIText } from '@/components/ui';
import { useElapsedMs } from '@/hooks/useElapsedMs';
import { formatElapsed } from '@/lib/format';
import { countSets, exerciseCompletion } from '@/lib/session';
import { cn } from '@/lib/utils';
import { useClientSessionStore } from '@/store/clientSessionStore';

interface TrainResumeBannerProps {
  readonly session: ApiClientSession | null;
}

/**
 * A workout left running is the single most important thing on this screen, so
 * it sits above everything and says how far in they already are.
 *
 * The dots are one per exercise rather than per week — they came off the
 * program card that used to sit at the bottom of this screen, where they
 * counted weeks of a block nobody could act on. Here they answer the question
 * actually being asked: how much of this workout is left.
 */
export default function TrainResumeBanner({ session }: TrainResumeBannerProps) {
  const router = useRouter();
  const sessionId = useClientSessionStore((state) => state.sessionId);
  const startedAtMs = useClientSessionStore((state) => state.startedAtMs);
  const draft = useClientSessionStore((state) => state.sets);
  const elapsedMs = useElapsedMs(startedAtMs);

  if (!sessionId || !session) return null;

  const { completed, total } = countSets(session.exercises, draft);
  const done = exerciseCompletion(session.exercises, draft);
  const doneCount = done.filter(Boolean).length;

  return (
    <LICard
      className="gap-3 border border-violet-line"
      onPress={() => router.push(`/train/session/${sessionId}`)}
      accessibilityLabel={`${session.title} in progress, ${doneCount} of ${done.length} exercises done. Resume.`}
      testID="train-resume-banner"
    >
      <View className="flex-row items-center gap-3">
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
      </View>

      {done.length > 0 ? (
        <View
          className="flex-row items-center gap-1.5"
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: done.length, now: doneCount }}
        >
          {done.map((isDone, index) => (
            <View
              key={session.exercises[index].id}
              className={cn('h-2 flex-1 rounded-pill', isDone ? 'bg-violet' : 'bg-field')}
            />
          ))}
        </View>
      ) : null}
    </LICard>
  );
}
