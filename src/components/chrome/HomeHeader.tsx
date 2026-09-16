import ScreenHeader from '@/components/chrome/ScreenHeader';
import { firstName, formatToday, greeting } from '@/lib/format';
import { useAuthStore } from '@/store/authStore';

interface HomeHeaderProps {
  /**
   * The line under the greeting — what is true of the screen below it right
   * now. `null` while the screen is still loading: the greeting does not wait
   * for a query, and a subtitle that guesses is worse than one that arrives.
   */
  readonly subtitle?: string | null;
  /** Drives the dot. Fetched by the screen, like every other value in the app. */
  readonly unread?: boolean;
}

/**
 * The Today header, on both sides of the app.
 *
 * The name and the greeting come from the auth store rather than a query —
 * they are already in memory from the session, so this paints on the first
 * frame instead of after a round trip. Only the subtitle waits for data, and
 * it is the one line here that could be wrong if it did not.
 *
 * No back row: Today is a tab root, and there is nothing behind it to pop.
 */
export default function HomeHeader({ subtitle, unread = false }: HomeHeaderProps) {
  const user = useAuthStore((state) => state.user);
  const name = user?.name;

  return (
    <ScreenHeader
      eyebrow={formatToday()}
      // Without a name the greeting stands on its own rather than reading
      // "Good morning, " with nothing after the comma.
      title={name ? `${greeting()}, ${firstName(name)}` : greeting()}
      subtitle={subtitle ?? undefined}
      // The one screen that carries it: Today is where you land and where you
      // look for what you missed.
      bell
      unread={unread}
      // Today's own size. A greeting is the longest title in the app and the
      // least important thing on the screen — the plan card under it is what
      // a client opened SetTrack to see.
      titleSize="h4"
      testID="home-header"
    />
  );
}
