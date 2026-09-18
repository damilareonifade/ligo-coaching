import { View } from 'react-native';

import { LIButton, LIText } from '@/components/ui';

interface InviteSummaryCardProps {
  /** Live count sentence — see `inviteSummaryLine` in src/lib/community.ts. */
  readonly summary: string;
  /** The promise the coach is held to. Verbatim from the design. */
  readonly note: string;
  readonly disabled: boolean;
  readonly loading: boolean;
  readonly onSend: () => void;
  /** "Send invites" unless there are none to send — see the client's group. */
  readonly sendLabel?: string;
  readonly testID: string;
}

/**
 * The last card on both create screens: what is about to be sent, the button
 * that sends it, and what the coach will and will not learn afterwards.
 *
 * The note sits under the button rather than above it because it describes
 * what happens next, not what to do now — and because a coach who reads it
 * after tapping still needs to have read it before wondering why nobody
 * appeared.
 */
export default function InviteSummaryCard({
  summary,
  note,
  disabled,
  loading,
  onSend,
  sendLabel = 'Send invites',
  testID,
}: InviteSummaryCardProps) {
  return (
    <View className="gap-3 rounded-card border border-violet-line bg-violet-weak/40 p-4">
      <LIText size="p" color="primary" text={summary} className="font-geist-medium" />

      <LIButton
        title={sendLabel}
        fullWidth
        shape="rounded"
        disabled={disabled}
        loading={loading}
        onPress={onSend}
        testID={testID}
      />

      <LIText size="caption" color="muted" text={note} className="font-geist" />
    </View>
  );
}
