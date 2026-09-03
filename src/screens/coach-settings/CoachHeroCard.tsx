import { Copy } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { LIAvatar, LIText } from '@/components/ui';
import { tokens } from '@/theme/tokens';

interface CoachHeroCardProps {
  readonly name: string;
  readonly headline: string;
  readonly inviteCode: string;
  readonly onCopy: () => void;
}

/**
 * The coach, and the one string that grows their roster.
 *
 * The invite code sits in a white inset on the tinted card rather than in the
 * settings list below, because it is the only thing on this screen a coach
 * opens the app specifically to read out loud. Everything under it is
 * configuration; this is the thing they came for.
 */
export default function CoachHeroCard({
  name,
  headline,
  inviteCode,
  onCopy,
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
        accessibilityRole="button"
        accessibilityLabel={`Copy invite code ${inviteCode}`}
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
          <LIText
            size="h4"
            color="primary"
            text={inviteCode}
            className="font-geist-semibold"
          />
        </View>
        <Copy color={tokens.violet} size={18} />
      </Pressable>
    </View>
  );
}
