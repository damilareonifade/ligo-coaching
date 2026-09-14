import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { useDeleteLabelMutation, useRenameLabelMutation } from '@/api/roster';
import type { ApiRoster, ApiRosterLabel } from '@/api/types';
import { LIModal } from '@/components/LIModal';
import { LIButton, LICard, LIInput, LIText } from '@/components/ui';
import { useRosterFilterStore } from '@/store/rosterFilterStore';
import { useUiStore } from '@/store/uiStore';
import { useThemeTokens } from '@/theme/tokens';

import LabelRow from './LabelRow';
import NewLabelCard from './NewLabelCard';

interface LabelsContentProps {
  readonly roster: ApiRoster;
  readonly refreshing: boolean;
  readonly onRefresh: () => void;
}

export default function LabelsContent({ roster, refreshing, onRefresh }: LabelsContentProps) {
  const tokens = useThemeTokens();
  const router = useRouter();
  const showToast = useUiStore((state) => state.showToast);
  const setLabelId = useRosterFilterStore((state) => state.setLabelId);
  const { mutate: renameLabel } = useRenameLabelMutation();
  const { mutate: deleteLabel } = useDeleteLabelMutation();

  // The label a sheet is about outlives the sheet's `visible` flag on purpose:
  // clearing it on confirm would blank the title mid dismiss-animation.
  const [renaming, setRenaming] = useState<ApiRosterLabel | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [deleting, setDeleting] = useState<ApiRosterLabel | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  /** Picking a label is a way of reading the roster, so it goes straight back. */
  const filterRoster = useCallback(
    (label: ApiRosterLabel) => {
      setLabelId(label.id);
      router.back();
    },
    [router, setLabelId],
  );

  const startRename = useCallback((label: ApiRosterLabel) => {
    setDraftName(label.name);
    setRenaming(label);
    setRenameOpen(true);
  }, []);

  const confirmRename = useCallback(() => {
    if (!renaming || draftName.trim().length === 0) return;
    renameLabel(
      { id: renaming.id, name: draftName },
      { onError: (error) => showToast(errorMessage(error), 'danger') },
    );
    setRenameOpen(false);
  }, [renaming, draftName, renameLabel, showToast]);

  const startDelete = useCallback((label: ApiRosterLabel) => {
    setDeleting(label);
    setDeleteOpen(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!deleting) return;
    deleteLabel(deleting.id, {
      onError: (error) => showToast(errorMessage(error), 'danger'),
    });
    setDeleteOpen(false);
  }, [deleting, deleteLabel, showToast]);

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 px-4 pb-10 pt-2"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.violet} />
        }
      >
        <LIText
          size="caption"
          color="muted"
          text="Labels are your own filing system. Clients never see them, and a label grants no access on its own."
          className="px-1 font-geist"
        />

        <View className="gap-2">
          <LIText
            size="caption"
            color="muted"
            text={`${roster.labels.length} LABELS`}
            className="px-1 font-geist-medium uppercase tracking-wide"
          />

          {roster.labels.length === 0 ? (
            <LICard>
              <LIText
                size="caption"
                color="muted"
                text="No labels yet. Add one below to start filing your roster."
                className="font-geist"
              />
            </LICard>
          ) : (
            <View>
              {roster.labels.map((label, index) => (
                <LabelRow
                  key={label.id}
                  label={label}
                  onPress={filterRoster}
                  onRename={startRename}
                  onDelete={startDelete}
                  first={index === 0}
                  last={index === roster.labels.length - 1}
                />
              ))}
            </View>
          )}

          <LIText
            size="caption"
            color="muted"
            text="Deleting a label removes the grouping only. No client is detached, no permission changes, no data is lost."
            className="px-1 font-geist"
          />
        </View>

        <NewLabelCard />
      </ScrollView>

      {/* Snapped tall rather than sized to content: a sheet that hugs a single
          field sits under the keyboard the moment it opens. */}
      <LIModal
        visible={renameOpen}
        onClose={() => {
          setRenameOpen(false);
          setRenaming(null);
        }}
        title="Rename label"
        snapPoints={['70%']}
      >
        <LIInput
          value={draftName}
          onChangeText={setDraftName}
          label="Name"
          autoFocus
          returnKeyType="done"
          onSubmitEditing={confirmRename}
          accessibilityLabel="Label name"
          testID="rename-label-input"
        />
        <LIButton
          title="Save"
          onPress={confirmRename}
          disabled={draftName.trim().length === 0}
          fullWidth
          testID="rename-label-save"
        />
        <LIButton title="Cancel" onPress={() => setRenameOpen(false)} variant="ghost" fullWidth />
      </LIModal>

      <LIModal
        visible={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleting(null);
        }}
        title={deleting ? `Delete “${deleting.name}”?` : 'Delete label?'}
      >
        <LIText
          size="p"
          color="body"
          text="Deleting a label removes the grouping only. No client is detached, no permission changes, no data is lost."
          className="font-geist"
        />
        <LIButton
          title="Delete label"
          onPress={confirmDelete}
          variant="danger"
          fullWidth
          testID="delete-label-confirm"
        />
        <LIButton title="Keep it" onPress={() => setDeleteOpen(false)} variant="ghost" fullWidth />
      </LIModal>
    </KeyboardAvoidingView>
  );
}
