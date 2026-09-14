import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import type { ApiCoachHome } from '@/api/types';
import { LIButton, LIEmptyState, LIText } from '@/components/ui';
import { useThemeTokens } from '@/theme/tokens';

import CoachHomeAttentionRow from './CoachHomeAttentionRow';
import CoachHomeLiveCard from './CoachHomeLiveCard';

interface CoachHomeContentProps {
  readonly home: ApiCoachHome;
  readonly refreshing: boolean;
  readonly onRefresh: () => void;
}

/**
 * The coach's home: who is on the gym floor, then who wants a look.
 *
 * It replaced a dashboard of scheduled sessions with times and a "missed"
 * badge — a shape this app does not have. Nothing is scheduled to a day, so
 * nothing can be missed, and a coach's question is not "what is on the board"
 * but "who needs me in the next ten minutes".
 *
 * Everybody else is on the roster, which is one tap away and is the register.
 * This screen is only ever the exceptions.
 */
export default function CoachHomeContent({
  home,
  refreshing,
  onRefresh,
}: CoachHomeContentProps) {
  const tokens = useThemeTokens();
  const router = useRouter();

  const openLive = useCallback(
    (clientId: string) => router.push(`/student/${clientId}/live`),
    [router],
  );

  const openClient = useCallback(
    (clientId: string) => router.push(`/student/${clientId}`),
    [router],
  );

  const quiet = home.training.length === 0 && home.needsALook.length === 0;

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="gap-4 px-4 pb-8 pt-2"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.violet} />
      }
      testID="coach-home-scroll"
    >
      {home.training.length > 0 ? (
        <View className="gap-3">
          <LIText
            size="caption"
            color="muted"
            text={
              home.training.length === 1
                ? 'TRAINING NOW'
                : `TRAINING NOW · ${home.training.length}`
            }
            className="font-geist-medium tracking-wide"
          />
          {home.training.map((client) => (
            <CoachHomeLiveCard key={client.clientId} client={client} onOpen={openLive} />
          ))}
        </View>
      ) : null}

      {home.needsALook.length > 0 ? (
        <View className="gap-3">
          <LIText
            size="caption"
            color="muted"
            text="WANTS A LOOK"
            className="font-geist-medium tracking-wide"
          />
          {home.needsALook.map((client) => (
            <CoachHomeAttentionRow key={client.id} client={client} onOpen={openClient} />
          ))}
        </View>
      ) : null}

      {quiet ? (
        <LIEmptyState
          title="Nobody needs you right now"
          message={
            home.rosterCount === 0
              ? 'Share your invite code and your first client can attach themselves.'
              : 'Nobody is training and nothing is waiting. A good moment to write next week.'
          }
        />
      ) : null}

      <LIButton
        title={
          home.rosterCount === 1 ? 'See your client' : `See all ${home.rosterCount} clients`
        }
        onPress={() => router.push('/roster')}
        variant="outline"
        fullWidth
        className="border-violet"
        labelClassName="text-violet"
        testID="coach-home-roster"
      />
    </ScrollView>
  );
}
