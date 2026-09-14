import { useCallback } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { useCoachProfileFormQuery } from '@/api/coachProfile';
import { LIErrorState, LISafeArea } from '@/components/ui';
import ScreenHeader from '@/components/chrome/ScreenHeader';
import CoachProfileForm from '@/screens/coach-profile/CoachProfileForm';
import CoachProfileSkeleton from '@/screens/coach-profile/CoachProfileSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/**
 * Settings → Account → Profile.
 *
 * Composer only — ScreenHeader sits inside the safe area, which owns the inset.
 * The form is mounted only once the values are in, so its fields seed from a
 * real profile rather than from '' and then jumping under the cursor.
 */
export default function CoachProfileScreen() {
  const { data, isPending, error, refetch } = useCoachProfileFormQuery();

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isPending) {
    return (
      <LISafeArea>
        <ScreenHeader
          title="Profile"
          eyebrow="Your coaching page"
          backLabel="Settings"
        />
        <CoachProfileSkeleton />
      </LISafeArea>
    );
  }

  if (error || !data) {
    return (
      <LISafeArea>
        <ScreenHeader
          title="Profile"
          eyebrow="Your coaching page"
          backLabel="Settings"
        />
        <LIErrorState message={error?.message} onRetry={refresh} />
      </LISafeArea>
    );
  }

  return (
    <LISafeArea>
      <ScreenHeader
        title="Profile"
        eyebrow="Your coaching page"
        backLabel="Settings"
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow"
          keyboardShouldPersistTaps="handled"
          testID="coach-profile-scroll"
        >
          <CoachProfileForm initial={data} />
        </ScrollView>
      </KeyboardAvoidingView>
    </LISafeArea>
  );
}
