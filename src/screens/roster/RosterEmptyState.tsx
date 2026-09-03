import { Check } from 'lucide-react-native';
import { useCallback } from 'react';
import { View } from 'react-native';

import { LIButton, LIText } from '@/components/ui';
import { useUiStore } from '@/store/uiStore';
import { tokens } from '@/theme/tokens';

interface RosterEmptyStateProps {
  readonly inviteCode: string;
}

/**
 * The coach's first run. It sets the terms before the first client arrives:
 * they attach themselves, they choose what is shared, and either side can end
 * it — so nothing here promises the coach access they have not been given.
 */
const expectations = [
  'They choose what you can see, before you see anything.',
  'You will never see a health profile or check-in they have not shared.',
  'Either of you can end it, and their data goes with them.',
] as const;

export default function RosterEmptyState({ inviteCode }: RosterEmptyStateProps) {
  const showToast = useUiStore((state) => state.showToast);

  // Stubbed: there is no clipboard write yet, and a silent "Copied" would be a lie.
  const copy = useCallback(() => showToast('Not connected yet', 'success'), [showToast]);

  return (
    <View className="gap-4 rounded-card bg-violet-weak p-5">
      <View className="gap-2">
        <LIText size="h4" color="primary" text="No clients yet" className="font-geist-semibold" />
        <LIText
          size="p"
          color="body"
          text="Send your code. A client attaches from their own profile and chooses what you can see — you will find their permissions on every row."
          className="font-geist"
        />
      </View>

      <View className="flex-row items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3">
        <LIText
          size="h4"
          color="primary"
          text={inviteCode}
          className="font-geist-semibold tracking-wide"
        />
        <LIButton
          title="Copy"
          onPress={copy}
          variant="ghost"
          size="sm"
          className="px-3"
          labelClassName="text-caption font-geist-medium"
          testID="roster-copy-code"
        />
      </View>

      <View className="gap-2">
        {expectations.map((line) => (
          <View key={line} className="flex-row items-start gap-2">
            <View className="pt-0.5">
              <Check color={tokens.violet} size={16} />
            </View>
            <LIText size="caption" color="body" text={line} className="flex-1 font-geist" />
          </View>
        ))}
      </View>
    </View>
  );
}
