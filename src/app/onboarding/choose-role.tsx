import { ScrollView } from 'react-native';

import { LISafeArea } from '@/components/ui';
import ChooseRoleAfterSignIn from '@/screens/onboarding/ChooseRoleAfterSignIn';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

export default function ChooseRoleScreen() {
  return (
    <LISafeArea edges={['top', 'bottom']} className="bg-background">
      <ScrollView contentContainerClassName="flex-grow" keyboardShouldPersistTaps="handled">
        <ChooseRoleAfterSignIn />
      </ScrollView>
    </LISafeArea>
  );
}
