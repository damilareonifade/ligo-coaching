import { useLocalSearchParams } from 'expo-router';

import { LISafeArea } from '@/components/ui';
import GoogleCallback from '@/screens/auth/GoogleCallback';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/**
 * `ligo://auth/callback` — the redirect target registered with Supabase.
 *
 * Deliberately outside both guards in the root layout: it has to render while
 * signed out (the normal case) and while signed in (a stale link opened after
 * the session was already established).
 */
export default function AuthCallbackScreen() {
  const {
    code,
    error,
    error_description: description,
  } = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_description?: string;
  }>();

  const text = (value: string | string[] | undefined): string | null =>
    typeof value === 'string' && value.length > 0 ? value : null;

  return (
    <LISafeArea edges={['top', 'bottom']} className="bg-background">
      <GoogleCallback code={text(code)} errorDescription={text(description) ?? text(error)} />
    </LISafeArea>
  );
}
