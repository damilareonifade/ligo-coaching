import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, useState, type ReactNode } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';

import { cn } from '@/lib/utils';
import { useThemeTokens } from '@/theme/tokens';

const field = cva('flex-row items-center rounded-2xl px-4', {
  variants: {
    variant: {
      /** Bordered on white — the default for labelled forms. */
      outline: 'border border-border bg-surface',
      /** Filled neutral surface, no visible border — label-less auth fields. */
      filled: 'border border-transparent bg-surface-sunken',
    },
    inputSize: {
      md: 'h-12',
      lg: 'h-14',
    },
    invalid: {
      true: 'border-danger',
      false: '',
    },
  },
  defaultVariants: { variant: 'outline', inputSize: 'md', invalid: false },
});

type FieldVariants = Omit<VariantProps<typeof field>, 'invalid'>;

export interface LIInputProps
  extends Omit<TextInputProps, 'className' | 'placeholderTextColor'>,
    FieldVariants {
  readonly label?: string;
  readonly error?: string;
  readonly hint?: string;
  readonly containerClassName?: string;
  /** Override the label `Text`'s className. */
  readonly labelClassName?: string;
  /**
   * Merged onto the bordered field row itself — the one place a caller can
   * reach the border, e.g. `border-violet` while the field has focus.
   */
  readonly fieldClassName?: string;
  /**
   * Merged onto the `TextInput` itself — for a field whose text is not body
   * copy, such as the big centred number on the workout set editor.
   */
  readonly inputClassName?: string;
  /** Rendered inside the field, before the text — a search or currency glyph. */
  readonly leading?: ReactNode;
  /** Rendered inside the field, after the text — a clear or unit affordance. */
  readonly trailing?: ReactNode;
}

export const LIInput = forwardRef<TextInput, LIInputProps>(function LIInput(
  {
    label,
    error,
    hint,
    containerClassName,
    labelClassName,
    fieldClassName,
    inputClassName,
    leading,
    trailing,
    variant = 'outline',
    inputSize = 'md',
    secureTextEntry,
    placeholder,
    ...inputProps
  },
  ref,
) {
  const tokens = useThemeTokens();
  const [revealed, setRevealed] = useState(false);
  const isPassword = secureTextEntry === true;

  return (
    <View className={cn('gap-1.5', containerClassName)}>
      {label ? (
        <Text className={cn('text-caption font-semibold text-foreground', labelClassName)}>{label}</Text>
      ) : null}

      <View
        className={cn(
          field({ variant, inputSize, invalid: Boolean(error) }),
          leading || trailing ? 'gap-2' : undefined,
          fieldClassName,
        )}
      >
        {leading}
        <TextInput
          ref={ref}
          className={cn('flex-1 text-p text-foreground-muted', inputClassName)}
          placeholder={placeholder}
          placeholderTextColor={tokens['foreground-subtle']}
          secureTextEntry={isPassword && !revealed}
          // Label-less fields still need a name for screen readers.
          accessibilityLabel={label ?? placeholder}
          {...inputProps}
        />
        {trailing}
        {isPassword ? (
          <Pressable
            onPress={() => setRevealed((current) => !current)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
          >
            <Text className="text-caption font-semibold text-violet">
              {revealed ? 'Hide' : 'Show'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text className="text-caption text-danger">{error}</Text>
      ) : hint ? (
        <Text className="text-caption text-foreground-subtle">{hint}</Text>
      ) : null}
    </View>
  );
});
