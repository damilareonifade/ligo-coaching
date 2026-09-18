import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { errorMessage } from '@/api/client';
import { useCreateGroupMutation } from '@/api/community';
import type { ApiRosterClient } from '@/api/types';
import { LIInput } from '@/components/ui';
import { CLIENT_GROUP_NOTE, GROUP_INVITE_NOTE, inviteSummaryLine } from '@/lib/community';
import CommunityEyebrow from '@/components/community/CommunityEyebrow';
import InviteSummaryCard from '@/components/community/InviteSummaryCard';
import RosterPickList from '@/components/roster/RosterPickList';
import { useUiStore } from '@/store/uiStore';

interface NewGroupContentProps {
  /** A coach's roster. Empty for a client, who has no one to list. */
  readonly clients: readonly ApiRosterClient[];
  readonly isClient: boolean;
}

/**
 * Naming a group and choosing who to ask is the entire power anybody has here.
 * There is no permission to grant, no data to attach and no way to put someone
 * in the group — the button says "Send invites" because that is literally all
 * it does.
 *
 * For a client it does not even do that. `invite_to_group` only accepts users
 * the caller is `is_linked_to`, and for a client that is their coach and
 * nobody else, so there is no list to show them — `create_group` takes a name
 * and nothing else, and the group fills by its join code. Which is why a
 * client is sent to the group afterwards instead of back: the code is the only
 * way in, and a group of one with no way to find it is not a group.
 *
 * `LIForm` gives no keyboard avoidance, so the screen owns it: the name field
 * sits above a long checkbox list and would otherwise be typed into blind.
 */
export default function NewGroupContent({ clients, isClient }: NewGroupContentProps) {
  const router = useRouter();
  const showToast = useUiStore((state) => state.showToast);
  const create = useCreateGroupMutation();

  const [name, setName] = useState('');
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);

  const toggle = useCallback((clientId: string) => {
    setSelectedIds((current) =>
      current.includes(clientId)
        ? current.filter((id) => id !== clientId)
        : [...current, clientId],
    );
  }, []);

  const clear = useCallback(() => setSelectedIds([]), []);

  const send = useCallback(() => {
    create.mutate(
      { name, clientIds: isClient ? [] : selectedIds },
      {
        onSuccess: (groupId: string) => {
          if (isClient) {
            // Onto the group, not back to the list. `replace` rather than
            // `push` so going back lands where they started rather than on a
            // create screen for a group they have already made.
            router.replace(`/community/group/${groupId}/manage`);
            showToast(`${name.trim()} is yours. Share the code to let people in.`, 'success');
            return;
          }

          router.back();
          showToast(
            `Invites sent for ${name.trim()}. Members appear as they accept.`,
            'success',
          );
        },
        onError: (error: unknown) => showToast(errorMessage(error), 'danger'),
      },
    );
  }, [create, isClient, name, router, selectedIds, showToast]);

  // A client sends no invites, so a name is the whole of it. Requiring a
  // selection they cannot make would leave the button dead for ever.
  const ready = name.trim().length > 0 && (isClient || selectedIds.length > 0);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-4 pb-10 pt-3"
        keyboardShouldPersistTaps="handled"
      >
        <CommunityEyebrow
          label="Community visibility"
          note={isClient ? 'Code to join' : 'Invites only'}
        />

        <LIInput
          label="Group name"
          placeholder="Summer strength group"
          value={name}
          onChangeText={setName}
          maxLength={40}
          hint={
            isClient
              ? 'Whoever you give the code to sees this name before they join.'
              : 'Members see this name on their invite, next to yours.'
          }
          testID="new-group-name"
        />

        {isClient ? null : (
          <RosterPickList
            clients={clients}
            selectedIds={selectedIds}
            onToggle={toggle}
            onClear={clear}
            label="Invite from roster"
          />
        )}

        <InviteSummaryCard
          summary={
            isClient
              ? 'It starts with you in it. Everybody else joins with its code.'
              : inviteSummaryLine(selectedIds.length, 'group')
          }
          note={isClient ? CLIENT_GROUP_NOTE : GROUP_INVITE_NOTE}
          disabled={!ready}
          loading={create.isPending}
          onSend={send}
          sendLabel={isClient ? 'Create group' : 'Send invites'}
          testID="new-group-send"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
