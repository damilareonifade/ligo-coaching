import { ScrollView } from 'react-native';

import { LISafeArea } from '@/components/ui';
import RoleSelect from '@/screens/onboarding/RoleSelect';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

export default function RoleScreen() {
  return (
    <LISafeArea edges={['top', 'bottom']} className="bg-canvas">
      <ScrollView contentContainerClassName="flex-grow" keyboardShouldPersistTaps="handled">
        <RoleSelect />
      </ScrollView>
    </LISafeArea>
  );
}
