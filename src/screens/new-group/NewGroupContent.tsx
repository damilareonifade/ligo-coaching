import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { errorMessage } from '@/api/client';
import { useCreateGroupMutation } from '@/api/community';
import type { ApiRosterClient } from '@/api/types';
import { LIInput } from '@/components/ui';
import { GROUP_INVITE_NOTE, inviteSummaryLine } from '@/lib/community';
import CommunityEyebrow from '@/screens/community-shared/CommunityEyebrow';
import InviteSummaryCard from '@/screens/community-shared/InviteSummaryCard';
import RosterPickList from '@/screens/community-shared/RosterPickList';
import { useUiStore } from '@/store/uiStore';

interface NewGroupContentProps {
  readonly clients: readonly ApiRosterClient[];
}

/**
 * The coach's side of a group, and the shortest screen in the feature, which
 * is the point: naming it and choosing who to ask is the entire power a coach
 * has here. There is no permission to grant, no data to attach and no way to
 * put a client in the group — the button says "Send invites" because that is
 * literally all it does.
 *
 * `LIForm` gives no keyboard avoidance, so the screen owns it: the name field
 * sits above a long checkbox list and would otherwise be typed into blind.
 */
export default function NewGroupContent({ clients }: NewGroupContentProps) {
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
      { name, clientIds: selectedIds },
      {
        onSuccess: () => {
          router.back();
          showToast(
            `Invites sent for ${name.trim()}. Members appear as they accept.`,
            'success',
          );
        },
        onError: (error: unknown) => showToast(errorMessage(error), 'danger'),
      },
    );
  }, [create, name, router, selectedIds, showToast]);

  const ready = name.trim().length > 0 && selectedIds.length > 0;

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
        <CommunityEyebrow label="Community visibility" note="Invites only" />

        <LIInput
          label="Group name"
          placeholder="Summer strength group"
          value={name}
          onChangeText={setName}
          maxLength={40}
          hint="Members see this name on their invite, next to yours."
          testID="new-group-name"
        />

        <RosterPickList
          clients={clients}
          selectedIds={selectedIds}
          onToggle={toggle}
          onClear={clear}
          label="Invite from roster"
        />

        <InviteSummaryCard
          summary={inviteSummaryLine(selectedIds.length, 'group')}
          note={GROUP_INVITE_NOTE}
          disabled={!ready}
          loading={create.isPending}
          onSend={send}
          testID="new-group-send"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
