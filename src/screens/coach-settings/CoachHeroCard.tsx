import { Copy, RefreshCw } from 'lucide-react-native';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { LIAvatar, LISkeleton, LIText } from '@/components/ui';
import { tokens } from '@/theme/tokens';

interface CoachHeroCardProps {
  readonly name: string;
  readonly headline: string;
  /** `undefined` while it loads — the inset shows a skeleton rather than ''. */
  readonly inviteCode: string | undefined;
  readonly onCopy: () => void;
  readonly onRoll: () => void;
  readonly rolling: boolean;
}

/**
 * The coach, and the one string that grows their roster.
 *
 * The invite code sits in a white inset on the tinted card rather than in the
 * settings list below, because it is the only thing on this screen a coach
 * opens the app specifically to read out loud. Everything under it is
 * configuration; this is the thing they came for.
 *
 * Rolling it is a separate target beside Copy rather than a settings row,
 * because it is the answer to "this code got out" — a thought a coach has
 * while looking at the code, not while scrolling a list. It is the quieter of
 * the two: copying is what this card is for, and rolling is what you do once.
 */
export default function CoachHeroCard({
  name,
  headline,
  inviteCode,
  onCopy,
  onRoll,
  rolling,
}: CoachHeroCardProps) {
  return (
    <View className="gap-4 rounded-card bg-violet-weak p-4" testID="coach-hero">
      <View className="flex-row items-center gap-3">
        <LIAvatar
          name={name}
          size="lg"
          className="bg-white"
          labelClassName="font-geist-semibold"
        />
        <View className="flex-1 gap-0.5">
          <LIText
            size="h3"
            color="primary"
            text={name}
            numberOfLines={1}
            className="font-geist-semibold"
          />
          <LIText
            size="caption"
            color="body"
            text={headline}
            className="font-geist"
            numberOfLines={1}
          />
        </View>
      </View>

      <Pressable
        onPress={onCopy}
        disabled={!inviteCode}
        accessibilityRole="button"
        accessibilityLabel={
          inviteCode ? `Copy invite code ${inviteCode}` : 'Invite code loading'
        }
        className="flex-row items-center gap-3 rounded-2xl bg-white px-4 py-3 active:opacity-80"
        testID="coach-invite-code"
      >
        <View className="flex-1 gap-0.5">
          <LIText
            size="caption"
            color="muted"
            text="Invite code"
            className="font-geist-medium"
          />
          {inviteCode ? (
            <LIText
              size="h4"
              color="primary"
              text={inviteCode}
              className="font-geist-semibold"
            />
          ) : (
            <LISkeleton className="h-6 w-28" />
          )}
        </View>
        <Copy color={tokens.violet} size={18} />
      </Pressable>

      <Pressable
        onPress={onRoll}
        disabled={!inviteCode || rolling}
        accessibilityRole="button"
        accessibilityLabel="Roll the invite code"
        accessibilityState={{ disabled: !inviteCode || rolling, busy: rolling }}
        className="flex-row items-center gap-2 self-start px-1 active:opacity-60"
        testID="coach-roll-invite-code"
      >
        {rolling ? (
          <ActivityIndicator size="small" color={tokens.violet} />
        ) : (
          <RefreshCw color={tokens.violet} size={14} />
        )}
        <LIText
          size="caption"
          color="accent"
          text={rolling ? 'Rolling…' : 'Roll code'}
          className="font-geist-medium text-violet"
        />
      </Pressable>
    </View>
  );
}
