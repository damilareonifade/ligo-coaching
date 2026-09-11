import { RefreshControl, ScrollView } from 'react-native';

import type { ApiClientProfile } from '@/api/types';
import { tokens } from '@/theme/tokens';

import ProfileCoachSection from './ProfileCoachSection';
import ProfileFooterNote from './ProfileFooterNote';
import ProfileHeroCard from './ProfileHeroCard';
import ProfileSettingsGroups from './ProfileSettingsGroups';

interface ProfileContentProps {
  readonly profile: ApiClientProfile;
  readonly refreshing: boolean;
  readonly onRefresh: () => void;
}

export default function ProfileContent({
  profile,
  refreshing,
  onRefresh,
}: ProfileContentProps) {
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
      <ProfileCoachSection coach={profile.coach} rows={profile.coachRows} />
      <ProfileSettingsGroups groups={profile.groups} />
      <ProfileFooterNote version={profile.version} />
    </ScrollView>
  );
}
