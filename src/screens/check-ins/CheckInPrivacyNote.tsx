import { LIText } from '@/components/ui';

interface CheckInPrivacyNoteProps {
  readonly note: string;
}

export default function CheckInPrivacyNote({ note }: CheckInPrivacyNoteProps) {
  return <LIText size="caption" color="muted" text={note} className="px-1 font-geist" />;
}
