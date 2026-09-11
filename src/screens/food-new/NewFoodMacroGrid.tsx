import type { FieldPath, FieldValues } from 'react-hook-form';
import { View } from 'react-native';

import { LIFormField } from '@/components/LIForm';
import { LICard, LIInput, LIText } from '@/components/ui';

interface MacroTileProps<TValues extends FieldValues> {
  readonly name: FieldPath<TValues>;
  readonly label: string;
}

function MacroTile<TValues extends FieldValues>({ name, label }: MacroTileProps<TValues>) {
  return (
    <View className="flex-1">
      <LIFormField<TValues>
        name={name}
        render={(field) => (
          <View className="gap-1">
            <LIInput
              variant="filled"
              placeholder="0"
              keyboardType="numeric"
              textAlign="center"
              value={typeof field.value === 'string' ? field.value : ''}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              accessibilityLabel={label}
              testID={`new-food-${String(name)}`}
            />
            <LIText
              size="caption"
              color="muted"
              text={label}
              className="text-center font-geist-medium tracking-wide"
            />
          </View>
        )}
      />
    </View>
  );
}

interface NewFoodMacroGridProps<TValues extends FieldValues> {
  readonly kcalName: FieldPath<TValues>;
  readonly proteinName: FieldPath<TValues>;
  readonly carbsName: FieldPath<TValues>;
  readonly fatName: FieldPath<TValues>;
}

/** The four numbers every food label carries, in the order the label prints them. */
export default function NewFoodMacroGrid<TValues extends FieldValues>({
  kcalName,
  proteinName,
  carbsName,
  fatName,
}: NewFoodMacroGridProps<TValues>) {
  return (
    <LICard className="gap-3">
      <LIText size="h5" color="primary" text="Per serving" className="font-geist-semibold" />
      <View className="flex-row gap-2">
        <MacroTile<TValues> name={kcalName} label="KCAL" />
        <MacroTile<TValues> name={proteinName} label="PROTEIN" />
        <MacroTile<TValues> name={carbsName} label="CARBS" />
        <MacroTile<TValues> name={fatName} label="FAT" />
      </View>
    </LICard>
  );
}
