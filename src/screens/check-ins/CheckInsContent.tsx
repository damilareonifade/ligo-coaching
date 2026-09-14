import { RefreshControl, ScrollView } from 'react-native';

import type { ApiMonthlyCheckIns } from '@/api/types';
import { LICard, LIText } from '@/components/ui';
import { tokens } from '@/theme/tokens';

import CheckInAddButton from './CheckInAddButton';
import CheckInCard from './CheckInCard';
import CheckInCoachToggle from './CheckInCoachToggle';
import CheckInPrivacyNote from './CheckInPrivacyNote';
import CheckInStats from './CheckInStats';

interface CheckInsContentProps {
  readonly checkIns: ApiMonthlyCheckIns;
  /**
   * Set when a coach is looking at a client's. Absent is the client reading
   * their own, which is the only case where the sharing toggle below belongs
   * on screen — it is the client's switch and a coach has no version of it.
   */
  readonly clientId?: string;
  readonly refreshing: boolean;
  readonly onRefresh: () => void;
}

/**
 * A ScrollView, not `LIList`: a check-in is monthly, so the list is bounded by
 * the calendar — a dozen cards a year, wrapped in stats and a permission toggle
 * that would otherwise have to become list headers and footers.
 */
export default function CheckInsContent({
  checkIns,
  clientId,
  refreshing,
  onRefresh,
}: CheckInsContentProps) {
  const isOwn = clientId === undefined;
  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="gap-4 px-4 pb-8 pt-2"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.violet} />
      }
    >
      <CheckInStats stats={checkIns.stats} />
      <CheckInAddButton clientId={clientId} />

      {checkIns.entries.length === 0 ? (
        <LICard>
          <LIText
            size="caption"
            color="muted"
            text="No check-ins yet. Log this month to start the record."
            className="font-geist"
          />
        </LICard>
      ) : (
        checkIns.entries.map((entry) => (
          <CheckInCard key={entry.id} entry={entry} clientId={clientId} />
        ))
      )}

      {isOwn && checkIns.coachName.length > 0 ? (
        <CheckInCoachToggle
          coachName={checkIns.coachName}
          enabled={checkIns.coachCanEdit}
        />
      ) : null}

      {isOwn ? <CheckInPrivacyNote note={checkIns.note} /> : null}
    </ScrollView>
  );
}
