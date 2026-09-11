import type { FieldPath, FieldValues } from 'react-hook-form';
import { View } from 'react-native';

import { LIFormField } from '@/components/LIForm';
import { LIInput, LIText } from '@/components/ui';

interface NewFoodFieldRowProps<TValues extends FieldValues> {
  readonly name: FieldPath<TValues>;
  readonly label: string;
  readonly placeholder: string;
  readonly optional?: boolean;
  readonly keyboardType?: 'default' | 'numeric';
  readonly autoCapitalize?: 'none' | 'sentences' | 'words';
}

/**
 * Label beside the field, not above it: four short rows read as one block that
 * way, and the 104px gutter keeps every input's left edge on the same line.
 */
export default function NewFoodFieldRow<TValues extends FieldValues>({
  name,
  label,
  placeholder,
  optional = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
}: NewFoodFieldRowProps<TValues>) {
  return (
    <LIFormField<TValues>
      name={name}
      render={(field) => (
        <View className="flex-row items-center gap-3">
          <View className="w-[104px]">
            <LIText size="caption" color="body" text={label} className="font-geist-medium" />
            {optional ? (
              <LIText size="caption" color="muted" text="Optional" className="font-geist" />
            ) : null}
          </View>
          <LIInput
            containerClassName="flex-1"
            variant="filled"
            placeholder={placeholder}
            value={typeof field.value === 'string' ? field.value : ''}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            accessibilityLabel={label}
            testID={`new-food-${String(name)}`}
          />
        </View>
      )}
    />
  );
}
