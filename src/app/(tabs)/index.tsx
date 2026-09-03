import { LISafeArea } from '@/components/ui';
import ClientTodayContent from '@/screens/client-today/ClientTodayContent';
import CoachTodayContent from '@/screens/dashboard/CoachTodayContent';
import { useAuthStore } from '@/store/authStore';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only: Today means two different screens depending on who is signed in. */
export default function TodayScreen() {
  const isClient = useAuthStore((state) => state.user?.role) === 'client';

  return <LISafeArea>{isClient ? <ClientTodayContent /> : <CoachTodayContent />}</LISafeArea>;
}
