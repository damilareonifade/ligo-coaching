import { useRouter } from 'expo-router';
import { Bell, ChevronLeft } from 'lucide-react-native';
import { useCallback, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { LIText } from '@/components/ui';
import { tokens } from '@/theme/tokens';
import type { LITextSize } from '@/theme/typography';

export interface ScreenHeaderProps {
  /** The large line. Truncated to one line — a title is a name, not a sentence. */
  readonly title: string;
  /**
   * The small line above it: the date on a screen about today, otherwise where
   * this screen lives ("Exercise library", "Your routine"). Omitted rather
   * than filled with the title's own words.
   */
  readonly eyebrow?: string;
  /**
   * Shows the back row and names what it returns to — "Train", "Builder".
   * Omitted on a tab root, which has nothing behind it to pop.
   */
  readonly backLabel?: string;
  /**
   * A third line under the title, for a screen whose state needs a sentence —
   * the coach's Today says what is on the floor right now. Most screens have
   * nothing true to put here and leave it out.
   */
  readonly subtitle?: string;
  /** Defaults to `router.back()`; pass one only when leaving needs a decision. */
  readonly onBack?: () => void;
  /**
   * One screen-level action — the `+` on Messages. Not a general slot:
   * anything bigger belongs in the screen.
   */
  readonly action?: ReactNode;
  /**
   * The notifications bell. Off everywhere except Today, on both sides of the
   * app: it is where you land, it is where you look for what you missed, and a
   * bell repeated on twenty screens is twenty invitations to leave whatever
   * you opened. See `HomeHeader`, the only caller that sets it.
   */
  readonly bell?: boolean;
  /** Whether the bell carries its dot. Ignored unless `bell` is set. */
  readonly unread?: boolean;
  /**
   * The title's size on the type scale. `h1` everywhere by default.
   *
   * Today sets its own, because its title is not the same kind of thing: every
   * other screen is titled with one or two words naming where you are, and
   * earns the full size. A greeting is a sentence with a name in it — at h1 it
   * truncated to "Good morning, Ma…", losing the one word the greeting exists
   * for — and it is not what a client opened the app to read. Smaller keeps
   * the plan card near the top, where it belongs.
   */
  readonly titleSize?: LITextSize;
  /** Replaces everything on the right — for a screen that needs its own. */
  readonly right?: ReactNode;
  readonly testID?: string;
}

/**
 * Every screen's top.
 *
 * One component rather than a native stack header, because the design puts
 * three things in a space the navigation bar has no room for: an eyebrow, a
 * title big enough to read at a glance, and a persistent right-hand cluster.
 * A centred 17pt title cannot carry "Good morning, Maya" over "Tuesday,
 * 16 June" — so the stack header is turned off on these routes and this stands
 * in, back chevron included. The swipe-back gesture is untouched; only the bar
 * is ours.
 *
 * The right-hand side is deliberately almost always empty. The bell belongs to
 * Today alone and is opt-in; Messages is the one screen with an action up here.
 * Everything else is a title and the way back.
 */
export default function ScreenHeader({
  title,
  eyebrow,
  subtitle,
  backLabel,
  onBack,
  action,
  bell = false,
  unread = false,
  titleSize = 'h1',
  right,
  testID,
}: ScreenHeaderProps) {
  const router = useRouter();

  const back = useCallback(() => {
    if (onBack) {
      onBack();
      return;
    }
    // A back button that does nothing is worse than none — see the same guard
    // in OnboardingBackButton.
    if (router.canGoBack()) router.back();
  }, [onBack, router]);

  return (
    <View className="gap-1 px-4 pb-3 pt-2" testID={testID}>
      {backLabel ? (
        <Pressable
          onPress={back}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Back to ${backLabel}`}
          className="-ml-1 flex-row items-center gap-1 self-start py-1 active:opacity-60"
          testID="screen-header-back"
        >
          <ChevronLeft color={tokens['dark-gray']} size={20} />
          <LIText size="p" color="body" text={backLabel} className="font-geist-medium" />
        </Pressable>
      ) : null}

      <View className="flex-row items-center gap-3">
        <View className="flex-1 gap-0.5">
          {eyebrow ? (
            <LIText size="caption" color="muted" text={eyebrow} numberOfLines={1} />
          ) : null}
          <LIText
            size={titleSize}
            color="primary"
            text={title}
            numberOfLines={1}
            className="font-geist-bold"
          />
          {subtitle ? <LIText size="p" color="body" text={subtitle} numberOfLines={1} /> : null}
        </View>

        {right ?? (
          <>
            {action}
            {bell ? <ScreenHeaderBell unread={unread} /> : null}
          </>
        )}
      </View>
    </View>
  );
}

/**
 * The way into the feed.
 *
 * One route for both sides: `/notifications` reads the feed for whoever is
 * signed in, so the bell does not have to know.
 *
 * The dot is real now — `unread` is fetched by the screen, as every other
 * value in the app is, and passed down. It used to be drawn unconditionally
 * because there was no events table and nothing could say what was waiting.
 */
function ScreenHeaderBell({ unread }: { readonly unread: boolean }) {
  const router = useRouter();
  const open = useCallback(() => router.push('/notifications'), [router]);

  return (
    <Pressable
      onPress={open}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={unread ? 'Notifications, unread' : 'Notifications'}
      className="h-11 w-11 items-center justify-center rounded-pill bg-white active:opacity-70"
      testID="screen-header-bell"
    >
      <Bell color={tokens.ink} size={20} />
      {unread ? (
        <View
          className="absolute right-2.5 top-2.5 h-2 w-2 rounded-pill border border-white bg-violet"
          testID="screen-header-bell-dot"
        />
      ) : null}
    </Pressable>
  );
}
