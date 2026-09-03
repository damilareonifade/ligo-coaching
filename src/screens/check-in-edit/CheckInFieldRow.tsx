import type { FieldPath, FieldValues } from 'react-hook-form';
import { View } from 'react-native';

import { LIFormField } from '@/components/LIForm';
import { LIInput, LIText } from '@/components/ui';

interface CheckInFieldRowProps<TValues extends FieldValues> {
  readonly name: FieldPath<TValues>;
  readonly label: string;
  /** Fixed-width suffix, e.g. "kg" — kept out of the input so it never scrolls. */
  readonly unit: string;
  readonly placeholder?: string;
}

/**
 * Label left, a narrow right-aligned number, then the unit in its own column, so
 * five rows of different units still line their digits up down the card.
 */
export default function CheckInFieldRow<TValues extends FieldValues>({
  name,
  label,
  unit,
  placeholder = '—',
}: CheckInFieldRowProps<TValues>) {
  return (
    <LIFormField<TValues>
      name={name}
      render={(field) => (
        <View className="flex-row items-center gap-3">
          <LIText size="p" color="body" text={label} className="flex-1 font-geist-medium" />
          <LIInput
            containerClassName="w-[88px]"
            variant="filled"
            placeholder={placeholder}
            value={typeof field.value === 'string' ? field.value : ''}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            keyboardType="decimal-pad"
            textAlign="right"
            accessibilityLabel={`${label} in ${unit}`}
            testID={`check-in-${String(name)}`}
          />
          <LIText size="caption" color="muted" text={unit} className="w-8 font-geist" />
        </View>
      )}
    />
  );
}
