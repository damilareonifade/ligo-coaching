import { forwardRef, useState } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';

import { cn } from '@/lib/utils';
import { tokens } from '@/theme/tokens';

export interface LIInputProps extends Omit<TextInputProps, 'className' | 'placeholderTextColor'> {
  readonly label?: string;
  readonly error?: string;
  readonly hint?: string;
  readonly containerClassName?: string;
}

export const LIInput = forwardRef<TextInput, LIInputProps>(function LIInput(
  { label, error, hint, containerClassName, secureTextEntry, ...inputProps },
  ref,
) {
  const [revealed, setRevealed] = useState(false);
  const isPassword = secureTextEntry === true;

  return (
    <View className={cn('gap-1.5', containerClassName)}>
      {label ? <Text className="text-caption font-semibold text-navy">{label}</Text> : null}

      <View
        className={cn(
          'h-12 flex-row items-center rounded-2xl border bg-white px-4',
          error ? 'border-danger' : 'border-gray',
        )}
      >
        <TextInput
          ref={ref}
          className="flex-1 text-p text-dark-gray"
          placeholderTextColor={tokens.muted}
          secureTextEntry={isPassword && !revealed}
          accessibilityLabel={label}
          {...inputProps}
        />
        {isPassword ? (
          <Pressable onPress={() => setRevealed((current) => !current)} hitSlop={8}>
            <Text className="text-caption font-semibold text-navy">
              {revealed ? 'Hide' : 'Show'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text className="text-caption text-danger">{error}</Text>
      ) : hint ? (
        <Text className="text-caption text-muted">{hint}</Text>
      ) : null}
    </View>
  );
});
