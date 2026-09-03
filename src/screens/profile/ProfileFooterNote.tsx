import { LIText } from '@/components/ui';

interface ProfileFooterNoteProps {
  readonly version: string;
}

/** The promise the app makes, where a reader is most likely to be weighing it. */
export default function ProfileFooterNote({ version }: ProfileFooterNoteProps) {
  return (
    <LIText
      size="caption"
      color="muted"
      text={version}
      className="px-2 pt-2 text-center font-geist"
    />
  );
}
