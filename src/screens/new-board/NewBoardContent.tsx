import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { errorMessage } from '@/api/client';
import { useCreateBoardMutation } from '@/api/community';
import type { ApiRosterClient, BoardMetric, BoardWindow } from '@/api/types';
import { LIInput } from '@/components/ui';
import {
  BOARD_INVITE_NOTE,
  BOARD_METRIC_OPTIONS,
  boardMetricLabel,
  boardWindowLabel,
  inviteSummaryLine,
} from '@/lib/community';
import CommunityEyebrow from '@/components/community/CommunityEyebrow';
import InviteSummaryCard from '@/components/community/InviteSummaryCard';
import RosterPickList from '@/components/roster/RosterPickList';
import { useUiStore } from '@/store/uiStore';

import BoardWindowPicker from './BoardWindowPicker';
import MetricChoiceList from './MetricChoiceList';

interface NewBoardContentProps {
  readonly clients: readonly ApiRosterClient[];
}

/**
 * The coach chooses what is measured, over what window, and who to ask. They
 * do not choose who appears, and there is nowhere on this screen where that
 * could be expressed — a board created here has no rows until clients put
 * themselves on it under a name they picked.
 *
 * `LIForm` gives no keyboard avoidance, so the screen owns it: the name field
 * and the two custom-date fields all sit above the fold of the keyboard.
 */
export default function NewBoardContent({ clients }: NewBoardContentProps) {
  const router = useRouter();
  const showToast = useUiStore((state) => state.showToast);
  const create = useCreateBoardMutation();

  const [name, setName] = useState('');
  const [metric, setMetric] = useState<BoardMetric>('volume');
  const [window, setWindow] = useState<BoardWindow>('month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);

  const toggle = useCallback((clientId: string) => {
    setSelectedIds((current) =>
      current.includes(clientId)
        ? current.filter((id) => id !== clientId)
        : [...current, clientId],
    );
  }, []);

  const clear = useCallback(() => setSelectedIds([]), []);

  const windowLabel = boardWindowLabel(window, from, to);

  const send = useCallback(() => {
    create.mutate(
      {
        name,
        metric,
        metricLabel: boardMetricLabel(metric, windowLabel),
        windowLabel,
        clientIds: selectedIds,
      },
      {
        onSuccess: () => {
          router.back();
          showToast(
            `Invites sent for ${name.trim()}. The board stays empty until people opt in.`,
            'success',
          );
        },
        onError: (error: unknown) => showToast(errorMessage(error), 'danger'),
      },
    );
  }, [create, metric, name, router, selectedIds, showToast, windowLabel]);

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
        <CommunityEyebrow label="Community visibility" note="Opt-in only" />

        <LIInput
          label="Leaderboard name"
          placeholder="Autumn volume challenge"
          value={name}
          onChangeText={setName}
          maxLength={40}
          hint="Clients see this name and the metric before they decide."
          testID="new-board-name"
        />

        <MetricChoiceList options={BOARD_METRIC_OPTIONS} value={metric} onChange={setMetric} />

        <BoardWindowPicker
          value={window}
          onChange={setWindow}
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
        />

        <RosterPickList
          clients={clients}
          selectedIds={selectedIds}
          onToggle={toggle}
          onClear={clear}
          label="Invite from roster"
        />

        <InviteSummaryCard
          summary={inviteSummaryLine(selectedIds.length, 'board')}
          note={BOARD_INVITE_NOTE}
          disabled={!ready}
          loading={create.isPending}
          onSend={send}
          testID="new-board-send"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
