import { LIText } from '@/components/ui';

/**
 * The one thing a coach has to understand before they publish: a client's copy
 * is theirs. Said once, at the foot of the library, rather than in a dialog
 * they would dismiss.
 */
export default function ProgramsNote() {
  return (
    <LIText
      size="caption"
      color="muted"
      text="Publishing sends the client a copy they own. Edits create a version they can accept — you can't rewrite a week they already trained."
      className="px-1 font-geist"
    />
  );
}
