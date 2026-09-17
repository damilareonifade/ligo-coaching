import { Check, ChevronDown } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { LIDivider, LIPressable, LIText } from '@/components/ui';
import { cn } from '@/lib/utils';
import { timing, useMotion } from '@/theme/motion';
import { useThemeTokens } from '@/theme/tokens';

import { LIModal } from './LIModal';

export interface LISelectOption {
  readonly label: string;
  readonly value: string;
}

export interface LISelectProps {
  readonly label?: string;
  readonly placeholder?: string;
  readonly value: string | null;
  readonly options: readonly LISelectOption[];
  readonly onChange: (value: string) => void;
  readonly error?: string;
  readonly className?: string;
}

export function LISelect({
  label,
  placeholder = 'Select an option',
  value,
  options,
  onChange,
  error,
  className,
}: LISelectProps) {
  const tokens = useThemeTokens();
  const { reduced } = useMotion();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value) ?? null;

  /**
   * The caret turns over while the sheet is on its way up.
   *
   * It is the only part of a select that stays on screen through the
   * transition, so it is the only thing that can connect the field you
   * touched to the list that appeared — without it the sheet reads as having
   * arrived from nowhere.
   */
  const caret = useSharedValue(0);

  useEffect(() => {
    const target = open ? 1 : 0;
    caret.value = reduced ? target : withTiming(target, timing.base);
  }, [caret, open, reduced]);

  const caretStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${caret.value * 180}deg` }],
  }));

  const handleSelect = useCallback(
    (next: string) => {
      onChange(next);
      setOpen(false);
    },
    [onChange],
  );

  return (
    <View className={cn('gap-1.5', className)}>
      {label ? (
        <LIText size="caption" color="primary" text={label} className="font-semibold" />
      ) : null}

      <LIPressable
        stretch
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label ?? placeholder}
        accessibilityState={{ expanded: open }}
        className={cn(
          'h-12 flex-row items-center justify-between rounded-2xl border bg-surface px-4',
          error ? 'border-danger' : 'border-border',
        )}
      >
        <LIText
          size="p"
          color={selected ? 'body' : 'muted'}
          text={selected?.label ?? placeholder}
        />
        {/* A drawn chevron rather than the "▾" character this used to set:
            that glyph is a different size and sits on a different baseline in
            every font that has it, and it cannot be turned. */}
        <Animated.View style={caretStyle}>
          <ChevronDown color={tokens['foreground-subtle']} size={18} />
        </Animated.View>
      </LIPressable>

      {error ? <LIText size="caption" color="danger" text={error} /> : null}

      <LIModal visible={open} onClose={() => setOpen(false)} title={label ?? placeholder}>
        <View>
          {options.map((option, index) => (
            <View key={option.value}>
              {index > 0 ? <LIDivider /> : null}
              <LIPressable
                stretch
                onPress={() => handleSelect(option.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: option.value === value }}
                // `dim` rather than the default sink: these rows run the full
                // width of the sheet, and one scaling down detaches visibly
                // from the divider above and below it.
                effect="dim"
                className="flex-row items-center justify-between py-4"
              >
                <LIText
                  size="p"
                  color={option.value === value ? 'primary' : 'body'}
                  text={option.label}
                />
                {option.value === value ? (
                  <Check color={tokens.violet} size={18} strokeWidth={2.5} />
                ) : null}
              </LIPressable>
            </View>
          ))}
        </View>
      </LIModal>
    </View>
  );
}
