import { EyeOff, FileText, MessageSquareOff, ShieldCheck } from 'lucide-react-native';
import { useMemo, type ReactNode } from 'react';

import type { DetachConsequence } from '@/lib/detach';
import {
  DETACH_CONFIRM_TITLE,
  DETACH_CONSEQUENCES,
  DETACH_DISMISS_TITLE,
  detachBody,
  detachTitle,
} from '@/lib/detach';
import LeaveSheet, { type LeaveConsequence } from '@/screens/community-shared/LeaveSheet';
import { tokens } from '@/theme/tokens';

interface DetachCoachSheetProps {
  readonly visible: boolean;
  readonly coachName: string;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
  readonly loading: boolean;
}

const ICON_SIZE = 18;

/**
 * One icon per consequence, keyed off the row's id rather than its position,
 * so re-ordering the copy in src/lib/detach.ts cannot silently put the
 * "history is safe" tick next to "access ends".
 *
 * Only the first is drawn in danger. Three of the four rows are reassurances —
 * colouring them all red would turn a sheet that says "you keep everything"
 * into one that reads as a warning about losing it.
 */
const ICONS: Record<DetachConsequence['id'], ReactNode> = {
  access: <EyeOff color={tokens.danger} size={ICON_SIZE} />,
  data: <ShieldCheck color={tokens.violet} size={ICON_SIZE} />,
  programs: <FileText color={tokens.violet} size={ICON_SIZE} />,
  thread: <MessageSquareOff color={tokens.muted} size={ICON_SIZE} />,
};

/**
 * The client's side of every permission screen in the app, in one sheet.
 *
 * It is the same component the community leave flows use, with different rows
 * — deliberately, because the two are the same decision at different scales,
 * and a client who has left a leaderboard should recognise this screen. What
 * is not shared is a "keep in touch" or "pause instead" escape hatch: detaching
 * is one tap from here, and the only thing between the tap and the effect is
 * four sentences saying exactly what it does.
 */
export default function DetachCoachSheet({
  visible,
  coachName,
  onClose,
  onConfirm,
  loading,
}: DetachCoachSheetProps) {
  const consequences = useMemo<readonly LeaveConsequence[]>(
    () =>
      DETACH_CONSEQUENCES.map((consequence) => ({
        id: consequence.id,
        icon: ICONS[consequence.id],
        title: consequence.title,
        body: consequence.body,
      })),
    [],
  );

  return (
    <LeaveSheet
      visible={visible}
      onClose={onClose}
      title={detachTitle(coachName)}
      body={detachBody(coachName)}
      consequences={consequences}
      confirmTitle={DETACH_CONFIRM_TITLE}
      dismissTitle={DETACH_DISMISS_TITLE}
      onConfirm={onConfirm}
      loading={loading}
      testID="detach-coach-sheet"
    />
  );
}
