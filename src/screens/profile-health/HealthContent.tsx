import { useCallback } from 'react';
import { ScrollView } from 'react-native';

import { useToggleHealthShareMutation } from '@/api/clientProfile';
import type { ApiClientHealth } from '@/api/types';

import HealthSectionCard from './HealthSectionCard';
import HealthShareNotice from './HealthShareNotice';

interface HealthContentProps {
  readonly health: ApiClientHealth;
}

export default function HealthContent({ health }: HealthContentProps) {
  const toggleShare = useToggleHealthShareMutation();

  const toggle = useCallback(() => {
    toggleShare.mutate(!health.sharedWithCoach);
  }, [toggleShare, health.sharedWithCoach]);

  return (
    <ScrollView className="flex-1" contentContainerClassName="gap-4 px-4 pb-8 pt-2">
      <HealthShareNotice
        shared={health.sharedWithCoach}
        note={health.shareNote}
        pending={toggleShare.isPending}
        onToggle={toggle}
      />
      {health.sections.map((section) => (
        <HealthSectionCard key={section.id} section={section} />
      ))}
    </ScrollView>
  );
}
