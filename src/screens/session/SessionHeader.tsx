import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';

import { LIBadge, LIInput, LIText } from '@/components/ui';
import { useThemeTokens } from '@/theme/tokens';

interface SessionHeaderProps {
  readonly title: string;
  readonly onRename: (title: string) => void;
}

/**
 * In-screen rather than the native stack header: the workout needs a status
 * line ("In progress") and a title big enough to read at arm's length on a
 * bench, neither of which fits a navigation bar. It is also the one screen
 * that keeps its own header rather than `ScreenHeader` — mid-set, the title is
 * editable and the status matters more than where you came from.
 *
 * No bell. It used to carry one, opening the notification preferences form
 * with a dot that promised a feed — and this is the screen where leaving costs
 * the most. The bell lives on Today now, on both sides.
 */
export default function SessionHeader({ title, onRename }: SessionHeaderProps) {
  const tokens = useThemeTokens();
  const router = useRouter();

  const [renaming, setRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);

  const back = useCallback(() => router.back(), [router]);

  const openRename = useCallback(() => {
    setDraftTitle(title);
    setRenaming(true);
  }, [title]);

  const saveRename = useCallback(() => {
    const trimmed = draftTitle.trim();
    setRenaming(false);
    // An emptied box keeps the name it had — a workout with no name is worse
    // than one still called "Upper A".
    if (trimmed.length > 0 && trimmed !== title) onRename(trimmed);
  }, [draftTitle, title, onRename]);

  return (
    <View className="gap-1 px-4 pb-2 pt-1">
      <Pressable
        onPress={back}
        accessibilityRole="button"
        accessibilityLabel="Back to Train"
        hitSlop={8}
        className="flex-row items-center gap-0.5 self-start active:opacity-70"
        testID="session-back"
      >
        <ChevronLeft color={tokens['foreground-muted']} size={18} />
        <LIText size="p" color="body" text="Train" className="font-geist" />
      </Pressable>

      <LIText size="caption" color="muted" text="In progress" className="font-geist" />

      <View className="flex-row items-center gap-2">
        {renaming ? (
          <LIInput
            value={draftTitle}
            onChangeText={setDraftTitle}
            onBlur={saveRename}
            onSubmitEditing={saveRename}
            autoFocus
            selectTextOnFocus
            returnKeyType="done"
            accessibilityLabel="Workout name"
            variant="filled"
            inputSize="lg"
            containerClassName="flex-1"
            inputClassName="text-h2 font-geist-bold text-foreground"
            testID="session-title-input"
          />
        ) : (
          <Pressable
            onPress={openRename}
            accessibilityRole="button"
            accessibilityLabel={`Workout name, ${title}. Rename.`}
            hitSlop={6}
            className="flex-1 active:opacity-70"
            testID="session-title"
          >
            <LIText
              size="h1"
              color="primary"
              text={title}
              numberOfLines={1}
              className="font-geist-bold"
            />
          </Pressable>
        )}

        {/* Whose log this is. It matters on a shared session: a coach opening
            the same workout is reading it, the client is writing it. */}
        <LIBadge tone="neutral" label="Client" labelClassName="font-geist-medium" />
      </View>
    </View>
  );
}
