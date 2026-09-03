import { Pressable, Text, View } from 'react-native';

import { cn } from '@/lib/utils';

export interface LISegmentedOption {
  readonly label: string;
  readonly value: string;
}

export interface LISegmentedProps {
  readonly options: readonly LISegmentedOption[];
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly className?: string;
  readonly testID?: string;
}

/** Single-select segmented control on a rounded `bg-field` track. */
export function LISegmented({ options, value, onChange, className, testID }: LISegmentedProps) {
  return (
    <View
      className={cn('flex-row gap-1 rounded-pill bg-field p-1', className)}
      testID={testID}
      accessibilityRole="radiogroup"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            className={cn(
              'flex-1 items-center justify-center rounded-pill px-2 py-2',
              selected && 'bg-violet',
            )}
          >
            <Text
              className={cn(
                'text-caption font-semibold font-geist-medium',
                selected ? 'text-white' : 'text-dark-gray',
              )}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
