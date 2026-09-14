import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { errorMessage } from '@/api/client';
import {
  useDeleteHealthEntryMutation,
  useSaveHealthEntryMutation,
  useToggleHealthShareMutation,
} from '@/api/clientProfile';
import type { ApiClientHealth } from '@/api/types';
import { LIButton } from '@/components/ui';
import type { HealthSection, InjuryStatus } from '@/lib/health';
import { useUiStore } from '@/store/uiStore';

import HealthEntryForm from './HealthEntryForm';
import HealthSectionCard from './HealthSectionCard';
import HealthShareNotice from './HealthShareNotice';

interface HealthContentProps {
  readonly health: ApiClientHealth;
}

/**
 * Every write for this screen is here; the cards below take data and
 * callbacks.
 *
 * One section opens for editing at a time. Two open forms on a screen of
 * medical history is two places to lose track of what you were typing.
 */
export default function HealthContent({ health }: HealthContentProps) {
  const showToast = useUiStore((state) => state.showToast);
  const toggleShare = useToggleHealthShareMutation();
  const saveEntry = useSaveHealthEntryMutation();
  const deleteEntry = useDeleteHealthEntryMutation();

  const [adding, setAdding] = useState<HealthSection | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const toggle = useCallback(() => {
    toggleShare.mutate(!health.sharedWithCoach, {
      onError: (error) => showToast(errorMessage(error), 'danger'),
    });
  }, [health.sharedWithCoach, showToast, toggleShare]);

  const save = useCallback(
    (section: HealthSection) =>
      (label: string, value: string, status: InjuryStatus | null) => {
        saveEntry.mutate(
          { section, label, value, status },
          {
            onSuccess: () => setAdding(null),
            onError: (error) => showToast(errorMessage(error), 'danger'),
          },
        );
      },
    [saveEntry, showToast],
  );

  const remove = useCallback(
    (entryId: string) => {
      setRemovingId(entryId);
      deleteEntry.mutate(entryId, {
        onError: (error) => showToast(errorMessage(error), 'danger'),
        onSettled: () => setRemovingId(null),
      });
    },
    [deleteEntry, showToast],
  );

  return (
    <ScrollView className="flex-1" contentContainerClassName="gap-4 px-4 pb-8 pt-2">
      <HealthShareNotice
        shared={health.sharedWithCoach}
        note={health.shareNote}
        pending={toggleShare.isPending}
        onToggle={toggle}
      />

      {health.sections.map((section) => (
        <View key={section.id} className="gap-2">
          <HealthSectionCard
            section={section}
            onRemove={remove}
            removingId={removingId}
          />

          {adding === section.id ? (
            <HealthEntryForm
              section={section.id as HealthSection}
              onSave={save(section.id as HealthSection)}
              onCancel={() => setAdding(null)}
              saving={saveEntry.isPending}
            />
          ) : (
            <LIButton
              title="Add"
              onPress={() => setAdding(section.id as HealthSection)}
              variant="outline"
              fullWidth
              className="border-violet"
              labelClassName="text-violet"
              testID={`health-add-${section.id}`}
            />
          )}
        </View>
      ))}
    </ScrollView>
  );
}
