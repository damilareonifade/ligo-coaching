import { ShieldCheck, ShieldOff } from 'lucide-react-native';
import { View } from 'react-native';

import type { ActivityKind } from '@/api/types';
import { isAccessLoss } from '@/lib/activity';
import { cn } from '@/lib/utils';
import { tokens } from '@/theme/tokens';

interface ActivityAccessGlyphProps {
  readonly kind: ActivityKind;
}

/**
 * Pinned to the corner of the avatar, and only ever on the four access kinds.
 * The point is that it is the *only* glyph in the feed: a coach scrolling past
 * a column of plain initials sees a shield and knows, before reading a word,
 * that this row is about what he can see rather than about training.
 *
 * Open shield for a grant, struck-through for a loss — the two are both access
 * news and must both stand out, but they are not the same news.
 */
export default function ActivityAccessGlyph({ kind }: ActivityAccessGlyphProps) {
  const lost = isAccessLoss(kind);
  const Icon = lost ? ShieldOff : ShieldCheck;

  return (
    <View
      className={cn(
        'absolute -bottom-0.5 -right-0.5 h-5 w-5 items-center justify-center rounded-pill border-2 border-white',
        lost ? 'bg-danger/10' : 'bg-violet-weak',
      )}
    >
      <Icon color={lost ? tokens.danger : tokens.violet} size={11} />
    </View>
  );
}
