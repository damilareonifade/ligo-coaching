import { Smartphone } from 'lucide-react-native';
import { View } from 'react-native';

import type { ApiDeviceSession } from '@/api/types';
import { LIButton, LICard, LIText } from '@/components/ui';
import { relativeTime } from '@/lib/format';
import { useThemeTokens } from '@/theme/tokens';

interface DeviceSessionsCardProps {
  readonly sessions: readonly ApiDeviceSession[];
  readonly onRevoke: (sessionId: string) => void;
  readonly revokingId: string | null;
}

/**
 * Where this account is signed in.
 *
 * The current device is labelled and has no revoke button — signing yourself
 * out belongs to the Sign out row below, not to a list of other people's
 * phones. Revoking is honest about its limit: it stops pushes to that device
 * and records the intent, but only GoTrue can invalidate its tokens, so the
 * copy says "stop notifications" rather than "sign out".
 */
export default function DeviceSessionsCard({
  sessions,
  onRevoke,
  revokingId,
}: DeviceSessionsCardProps) {
  const tokens = useThemeTokens();
  return (
    <View className="gap-2">
      <LIText size="caption" color="muted" text="DEVICES" className="px-1 font-geist-medium" />

      <LICard className="py-1">
        {sessions.length === 0 ? (
          <View className="px-3 py-4">
            <LIText
              size="p"
              color="muted"
              text="No other devices are signed in."
              className="font-geist"
            />
          </View>
        ) : (
          sessions.map((session, index) => (
            <View
              key={session.id}
              className={
                index === sessions.length - 1
                  ? 'flex-row items-center gap-3 px-3 py-3'
                  : 'flex-row items-center gap-3 border-b border-border px-3 py-3'
              }
            >
              <View className="h-9 w-9 items-center justify-center rounded-full bg-violet-weak">
                <Smartphone color={tokens.violet} size={18} />
              </View>

              <View className="flex-1">
                <LIText
                  size="p"
                  color="primary"
                  text={
                    session.isCurrentDevice
                      ? `${session.deviceName} · this device`
                      : session.deviceName
                  }
                  className="font-geist-medium"
                />
                <LIText
                  size="caption"
                  color="muted"
                  text={`Last used ${relativeTime(session.lastSeenAt)}`}
                  className="font-geist"
                />
              </View>

              {session.isCurrentDevice ? null : (
                <LIButton
                  title="Stop notifications"
                  onPress={() => onRevoke(session.id)}
                  variant="social"
                  size="sm"
                  shape="rounded"
                  loading={revokingId === session.id}
                  testID={`revoke-session-${session.id}`}
                />
              )}
            </View>
          ))
        )}
      </LICard>
    </View>
  );
}
