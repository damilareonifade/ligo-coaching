import { Lock } from 'lucide-react-native';
import { View } from 'react-native';

import type { ApiCoachNotification } from '@/api/types';
import { LICard, LISwitch, LIText } from '@/components/ui';
import { NOTIFICATION_LOCK_NOTE, canToggleNotification } from '@/lib/coachProfile';
import { cn } from '@/lib/utils';
import { tokens } from '@/theme/tokens';

interface CoachNotificationsCardProps {
  readonly rows: readonly ApiCoachNotification[];
  readonly onToggle: (id: string, enabled: boolean) => void;
}

/**
 * What buzzes, and the one thing that always will.
 *
 * The locked row renders on and disabled, with a lock beside its label so the
 * switch that will not move has a reason next to it rather than looking
 * broken. The refusal is not this component's doing — `canToggleNotification`
 * decides, and the mutation asks the same question before it writes, so the
 * rule survives a caller that never rendered this card.
 *
 * The note under the list explains why in the app's own terms: permission
 * changes are not a notification about the client, they are a notification
 * about the coach's own authority, and muting them would mean coaching on an
 * access that ended this morning.
 */
export default function CoachNotificationsCard({
  rows,
  onToggle,
}: CoachNotificationsCardProps) {
  return (
    <View className="gap-2">
      <LIText
        size="caption"
        color="muted"
        text="NOTIFICATIONS"
        className="px-1 font-geist-medium"
      />

      <LICard className="py-1">
        {rows.map((row, index) => {
          const togglable = canToggleNotification(row);

          return (
            <View
              key={row.id}
              className={cn(
                'flex-row items-center gap-3 py-3',
                index > 0 && 'border-t border-hairline',
              )}
              testID={`coach-notification-${row.id}`}
            >
              <View className="flex-1 gap-0.5">
                <View className="flex-row items-center gap-2">
                  <LIText
                    size="p"
                    color="primary"
                    text={row.label}
                    className="font-geist-medium"
                  />
                  {togglable ? null : <Lock color={tokens.muted} size={14} />}
                </View>
                <LIText size="caption" color="muted" text={row.desc} className="font-geist" />
              </View>

              {/* The locked row is still a switch — disabled and on — so a
                  screen reader announces it as one rather than as an unnamed
                  view, and the knob geometry stays in the primitive. */}
              <LISwitch
                value={row.enabled}
                disabled={!togglable}
                onValueChange={(next) => onToggle(row.id, next)}
                testID={`coach-switch-${row.id}`}
              />
            </View>
          );
        })}
      </LICard>

      <LIText
        size="caption"
        color="muted"
        text={NOTIFICATION_LOCK_NOTE}
        className="px-1 font-geist"
        testID="coach-notification-note"
      />
    </View>
  );
}
