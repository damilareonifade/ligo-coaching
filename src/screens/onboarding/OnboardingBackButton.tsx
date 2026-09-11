import { ChevronLeft } from 'lucide-react-native';
import { Pressable } from 'react-native';

import { tokens } from '@/theme/tokens';

export interface OnboardingBackButtonProps {
  readonly onPress: () => void;
}

/** Round back-button pill used at the top of every onboarding step. */
export function OnboardingBackButton({ onPress }: OnboardingBackButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={8}
      className="h-10 w-10 items-center justify-center rounded-pill bg-white shadow-sm"
      style={{
        shadowColor: tokens.ink,
        shadowOpacity: 0.12,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      <ChevronLeft color={tokens.ink} size={20} />
    </Pressable>
  );
}
