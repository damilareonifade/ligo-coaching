import { useCallback } from 'react';
import { ScrollView } from 'react-native';

import { useToggleNotificationMutation } from '@/api/clientProfile';
import type { ApiNotificationGroup, ApiNotificationSettings, ApiNotificationToggle } from '@/api/types';

import NotificationGroupCard from './NotificationGroupCard';
import QuietHoursCard from './QuietHoursCard';

interface NotificationsContentProps {
  readonly settings: ApiNotificationSettings;
}

export default function NotificationsContent({ settings }: NotificationsContentProps) {
  const toggle = useToggleNotificationMutation();

  const handleToggle = useCallback(
    (group: ApiNotificationGroup, row: ApiNotificationToggle) => {
      toggle.mutate({ groupId: group.id, rowId: row.id, enabled: !row.enabled });
    },
    [toggle],
  );

  return (
    <ScrollView className="flex-1" contentContainerClassName="gap-4 px-4 pb-8 pt-2">
      {settings.groups.map((group) => (
        <NotificationGroupCard
          key={group.id}
          group={group}
          onToggle={(row) => handleToggle(group, row)}
        />
      ))}
      <QuietHoursCard quietHours={settings.quietHours} />
    </ScrollView>
  );
}
