import * as Clipboard from 'expo-clipboard';
import { useCallback } from 'react';
import { Share } from 'react-native';

import { useUiStore } from '@/store/uiStore';

/* ------------------------------------------------------------------ *
 * Passing on an invite code.
 *
 * Three screens show the code — onboarding, the roster's empty state
 * and coach settings — and all three offered a Copy button that raised
 * "Not connected yet". A code nobody can copy is a code read aloud
 * across a gym and typed wrong, which is the one thing the no-I-no-O
 * alphabet was chosen to avoid.
 * ------------------------------------------------------------------ */

export interface InviteCodeActions {
  readonly copy: () => void;
  readonly share: () => void;
}

/** What the coach sends, rather than the bare code with no explanation. */
export function inviteMessage(code: string): string {
  return `Join me on SetTrack — my invite code is ${code}. You choose what I can see.`;
}

export function useInviteCodeActions(code: string | undefined): InviteCodeActions {
  const showToast = useUiStore((state) => state.showToast);

  const copy = useCallback(() => {
    if (!code) return;
    void Clipboard.setStringAsync(code).then(
      () => showToast('Code copied', 'success'),
      // The clipboard can genuinely refuse — say so rather than claiming a
      // copy that did not happen, which is the failure this replaced.
      () => showToast('Could not copy the code', 'danger'),
    );
  }, [code, showToast]);

  const share = useCallback(() => {
    if (!code) return;
    // The OS sheet handles its own cancellation, so a dismissal is not an
    // error and says nothing.
    void Share.share({ message: inviteMessage(code) }).catch(() =>
      showToast('Could not open the share sheet', 'danger'),
    );
  }, [code, showToast]);

  return { copy, share };
}
