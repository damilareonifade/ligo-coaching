import { Eye, EyeOff } from 'lucide-react-native';
import { View } from 'react-native';

import { LIText } from '@/components/ui';
import { useThemeTokens } from '@/theme/tokens';

interface InviteVisibilityPanelProps {
  readonly visible: readonly string[];
  readonly hidden: readonly string[];
}

interface HalfProps {
  readonly title: string;
  readonly rows: readonly string[];
  readonly shown: boolean;
}

function Half({ title, rows, shown }: HalfProps) {
  const tokens = useThemeTokens();
  return (
    <View className={shown ? 'gap-2 bg-surface p-4' : 'gap-2 border-t border-border bg-background p-4'}>
      <LIText
        size="caption"
        color="muted"
        text={title.toUpperCase()}
        className="font-geist-medium tracking-wide"
      />
      {rows.map((row) => (
        <View key={row} className="flex-row items-start gap-2.5">
          {shown ? (
            <Eye color={tokens.violet} size={16} />
          ) : (
            <EyeOff color={tokens['foreground-subtle']} size={16} />
          )}
          <LIText
            size="p"
            color={shown ? 'body' : 'muted'}
            text={row}
            className="flex-1 font-geist"
          />
        </View>
      ))}
    </View>
  );
}

/**
 * Both halves of the answer, in one frame, at the same size.
 *
 * The private half is the longer list and it is not collapsed, greyed into
 * illegibility, or moved behind a "learn more". It sits on the canvas colour
 * rather than white so the eye reads two different things without either half
 * having to shout — a client should be able to see, in one glance, that far
 * more stays private than becomes visible, because that happens to be true.
 */
export default function InviteVisibilityPanel({ visible, hidden }: InviteVisibilityPanelProps) {
  return (
    <View className="overflow-hidden rounded-card border border-border">
      <Half title="If you accept, members can see" rows={visible} shown />
      <Half title="Stays private, always" rows={hidden} shown={false} />
    </View>
  );
}
