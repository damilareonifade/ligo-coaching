import { ChevronLeft } from 'lucide-react-native';
import { Pressable } from 'react-native';

import { useThemeTokens } from '@/theme/tokens';

export interface OnboardingBackButtonProps {
  readonly onPress: () => void;
}

/** Round back-button pill used at the top of every onboarding step. */
export function OnboardingBackButton({ onPress }: OnboardingBackButtonProps) {
  const tokens = useThemeTokens();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={8}
      className="h-10 w-10 items-center justify-center rounded-pill bg-surface shadow-sm"
      style={{
        shadowColor: tokens.foreground,
        shadowOpacity: 0.12,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      <ChevronLeft color={tokens.foreground} size={20} />
    </Pressable>
  );
}
