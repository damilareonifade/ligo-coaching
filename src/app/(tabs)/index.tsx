import { LISafeArea } from '@/components/ui';
import ClientTodayContent from '@/screens/client-today/ClientTodayContent';
import CoachHome from '@/screens/coach-home/CoachHome';
import { useAuthStore } from '@/store/authStore';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/**
 * Composer only, and the two halves are not the same screen with different
 * data. A client has a Today — one thing to do next. A coach has a gym floor:
 * who is training, who wants a look. See `CoachHome`.
 */
export default function HomeScreen() {
  // Defaults to the client half for an unknown role — see the note in
  // `(tabs)/_layout.tsx`. The two must agree, or the tab bar and the screen
  // under it would come from different apps.
  const isClient = useAuthStore((state) => state.user?.role) !== 'coach';

  return <LISafeArea>{isClient ? <ClientTodayContent /> : <CoachHome />}</LISafeArea>;
}
