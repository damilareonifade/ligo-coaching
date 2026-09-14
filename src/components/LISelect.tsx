import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';

import { LIDivider, LIText } from '@/components/ui';
import { cn } from '@/lib/utils';

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
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value) ?? null;

  const handleSelect = useCallback(
    (next: string) => {
      onChange(next);
      setOpen(false);
    },
    [onChange],
  );

  return (
    <View className={cn('gap-1.5', className)}>
      {label ? <LIText size="caption" color="primary" text={label} className="font-semibold" /> : null}

      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label ?? placeholder}
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
        <LIText size="caption" color="muted" text="▾" />
      </Pressable>

      {error ? <LIText size="caption" color="danger" text={error} /> : null}

      <LIModal visible={open} onClose={() => setOpen(false)} title={label ?? placeholder}>
        <View>
          {options.map((option, index) => (
            <View key={option.value}>
              {index > 0 ? <LIDivider /> : null}
              <Pressable
                onPress={() => handleSelect(option.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: option.value === value }}
                className="flex-row items-center justify-between py-4 active:opacity-70"
              >
                <LIText
                  size="p"
                  color={option.value === value ? 'primary' : 'body'}
                  text={option.label}
                />
                {option.value === value ? <LIText size="p" color="accent" text="✓" /> : null}
              </Pressable>
            </View>
          ))}
        </View>
      </LIModal>
    </View>
  );
}
