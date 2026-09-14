import { RefreshControl, ScrollView } from 'react-native';

import type { ApiAccessRequest, ApiClientProfile } from '@/api/types';
import { useThemeTokens } from '@/theme/tokens';

import AccessRequestList from './AccessRequestList';
import ProfileCoachSection from './ProfileCoachSection';
import ProfileFooterNote from './ProfileFooterNote';
import ProfileHeroCard from './ProfileHeroCard';
import ProfileSettingsGroups from './ProfileSettingsGroups';

interface ProfileContentProps {
  readonly profile: ApiClientProfile;
  /** What a coach has asked to see and this client has not answered. */
  readonly accessRequests: readonly ApiAccessRequest[];
  readonly refreshing: boolean;
  readonly onRefresh: () => void;
}

export default function ProfileContent({
  profile,
  accessRequests,
  refreshing,
  onRefresh,
}: ProfileContentProps) {
  const tokens = useThemeTokens();
  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="gap-4 px-4 pb-8 pt-2"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.violet} />
      }
    >
      <ProfileHeroCard
        name={profile.name}
        email={profile.email}
        memberSince={profile.memberSince}
        stats={profile.stats}
      />
      <AccessRequestList requests={accessRequests} />
      <ProfileCoachSection coach={profile.coach} rows={profile.coachRows} />
      <ProfileSettingsGroups groups={profile.groups} />
      <ProfileFooterNote version={profile.version} />
    </ScrollView>
  );
}
