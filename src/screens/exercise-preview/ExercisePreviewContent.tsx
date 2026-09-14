import { ScrollView, View } from 'react-native';

import type { ApiExercisePreview } from '@/api/types';
import { LIBadge, LICard, LIImage, LISkeleton, LIText } from '@/components/ui';

interface ExercisePreviewContentProps {
  readonly preview: ApiExercisePreview;
  /** True while the animation is being fetched for the first time, ever. */
  readonly fetchingGif?: boolean;
}

/** "Barbell · Chest · Intermediate", skipping whatever the catalogue lacks. */
function summary(preview: ApiExercisePreview): string {
  return [preview.equipment, preview.bodyPart, preview.difficulty]
    .filter((part): part is string => Boolean(part))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' · ');
}

/**
 * What a movement actually looks like.
 *
 * The animation is the point and gets the top of the screen, at a fixed
 * aspect so the page does not jump when it loads. `LIImage` wraps
 * `expo-image`, which plays GIFs and caches them — a client opening the same
 * exercise between sets should not re-download it.
 *
 * Instructions are numbered because they are a sequence, not a list of tips:
 * the order is the technique.
 */
export default function ExercisePreviewContent({
  preview,
  fetchingGif = false,
}: ExercisePreviewContentProps) {
  const meta = summary(preview);

  return (
    <ScrollView className="flex-1" contentContainerClassName="gap-4 px-4 pb-10 pt-2">
      {preview.gifUrl ? (
        <View className="overflow-hidden rounded-card bg-surface">
          <LIImage
            source={{ uri: preview.gifUrl }}
            className="aspect-square w-full"
            contentFit="contain"
            transition={150}
            testID="exercise-gif"
          />
        </View>
      ) : fetchingGif ? (
        // The first view of this exercise, ever. A skeleton at the animation's
        // own aspect, so the page does not jump when it arrives.
        <LISkeleton className="aspect-square w-full rounded-card" />
      ) : (
        // Not every catalogue entry has an animation, and an exercise somebody
        // typed never will. An empty frame with a reason beats a broken one
        // with none.
        <View className="items-center justify-center rounded-card border border-dashed border-border-strong py-14">
          <LIText
            size="caption"
            color="muted"
            text="No animation for this one."
            className="font-geist"
          />
        </View>
      )}

      <View className="gap-1">
        <LIText
          size="h3"
          color="primary"
          text={preview.name}
          className="font-geist-semibold"
        />
        {meta ? <LIText size="caption" color="muted" text={meta} className="font-geist" /> : null}
      </View>

      {preview.target || preview.secondaryMuscles.length > 0 ? (
        <View className="gap-2">
          <LIText size="caption" color="muted" text="MUSCLES" className="px-1 font-geist-medium" />
          <LICard className="gap-3">
            {preview.target ? (
              <View className="flex-row items-center justify-between gap-3">
                <LIText size="p" color="body" text="Primary" className="font-geist" />
                <LIBadge
                  tone="violet"
                  label={preview.target}
                  labelClassName="font-geist-medium"
                />
              </View>
            ) : null}
            {preview.secondaryMuscles.length > 0 ? (
              <View className="gap-2">
                <LIText size="p" color="body" text="Also worked" className="font-geist" />
                <View className="flex-row flex-wrap gap-2">
                  {preview.secondaryMuscles.map((muscle) => (
                    <LIBadge
                      key={muscle}
                      tone="neutral"
                      label={muscle}
                      labelClassName="font-geist-medium"
                    />
                  ))}
                </View>
              </View>
            ) : null}
          </LICard>
        </View>
      ) : null}

      {preview.instructions.length > 0 ? (
        <View className="gap-2">
          <LIText size="caption" color="muted" text="HOW TO" className="px-1 font-geist-medium" />
          <LICard className="gap-3">
            {preview.instructions.map((step, index) => (
              <View key={step} className="flex-row gap-3">
                <LIText
                  size="caption"
                  color="accent"
                  text={`${index + 1}`}
                  className="w-4 pt-0.5 font-geist-semibold"
                />
                <LIText size="p" color="body" text={step} className="flex-1 font-geist" />
              </View>
            ))}
          </LICard>
        </View>
      ) : null}
    </ScrollView>
  );
}
