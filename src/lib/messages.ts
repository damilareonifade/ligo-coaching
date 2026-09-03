import type { ApiChatMessage, ApiCoachThread, ApiInboxEntry } from '@/api/types';

/* ------------------------------------------------------------------ *
 * The coach's inbox. Messaging is the one channel a permission never
 * closes, so nothing in here filters on access — a client who shares
 * nothing still has a conversation, and it sorts with all the rest.
 * ------------------------------------------------------------------ */

/**
 * Search matches the two things actually on the row: who it is and what they
 * last said. Searching the preview matters more than it looks — a coach
 * remembers "the one about the incline volume" long before they remember which
 * of forty clients said it.
 */
export function filterInbox(
  entries: readonly ApiInboxEntry[],
  query: string,
): readonly ApiInboxEntry[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return entries;

  return entries.filter(
    (entry) =>
      entry.name.toLowerCase().includes(needle) || entry.preview.toLowerCase().includes(needle),
  );
}

export function unreadInboxCount(entries: readonly ApiInboxEntry[]): number {
  return entries.filter((entry) => entry.unread).length;
}

/**
 * Appending a message the reader just sent. Shared by the optimistic update and
 * the mock transport so the bubble that appears under the thumb is the same
 * bubble the refetch hands back — only the id and stamp differ, and the server
 * owns both.
 */
export function appendOwnMessage(
  thread: ApiCoachThread,
  message: ApiChatMessage,
): ApiCoachThread {
  return { ...thread, messages: [...thread.messages, message] };
}

/**
 * The inbox row for a thread that was just replied to. A coach who answers
 * someone and goes back to the list expects to see their own answer sitting
 * there — a stale preview reads as a message that never sent.
 */
export function withLatestPreview(
  entries: readonly ApiInboxEntry[],
  clientId: string,
  preview: string,
): readonly ApiInboxEntry[] {
  return entries.map((entry) =>
    entry.clientId === clientId ? { ...entry, preview, when: 'now', unread: false } : entry,
  );
}
