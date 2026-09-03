import { useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { useCallback } from 'react';
import { Pressable, View } from 'react-native';

import { useActivityQuery } from '@/api/coachActivity';
import { LIText } from '@/components/ui';
import { unreadActivityCount } from '@/lib/activity';
import { tokens } from '@/theme/tokens';

/**
 * The way into the feed. It carries its own query rather than taking a prop
 * because it is a header affordance, not part of the day's sessions — the
 * dashboard's data flow stays about the board, and this stays about the bell.
 *
 * The count is the whole point of putting it here: a permission change the
 * coach has not read yet should be visible from the first screen he opens.
 */
export default function DashboardActivityButton() {
  const router = useRouter();
  const { data } = useActivityQuery();
  const unread = unreadActivityCount(data ?? []);

  const open = useCallback(() => router.push('/activity'), [router]);

  return (
    <Pressable
      onPress={open}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={
        unread > 0 ? `Activity, ${unread} unread` : 'Activity'
      }
      className="h-11 w-11 items-center justify-center rounded-pill bg-white active:opacity-70"
      testID="dashboard-activity-button"
    >
      <Bell color={tokens.violet} size={20} />
      {unread > 0 ? (
        <View className="absolute right-1 top-1 h-4 min-w-4 items-center justify-center rounded-pill bg-violet px-1">
          <LIText
            size="caption"
            color="inverse"
            text={`${unread}`}
            className="text-[10px] font-geist-semibold leading-none"
          />
        </View>
      ) : null}
    </Pressable>
  );
}
