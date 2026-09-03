import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ScrollView, View } from 'react-native';
import { z } from 'zod';

import { errorMessage } from '@/api/client';
import { useCreateFoodMutation } from '@/api/clientNutrition';
import { LIForm } from '@/components/LIForm';
import { LIButton, LICard, LISwitch, LIText } from '@/components/ui';
import { useUiStore } from '@/store/uiStore';

import NewFoodFieldRow from './NewFoodFieldRow';
import NewFoodMacroGrid from './NewFoodMacroGrid';

/** Numbers arrive from the keypad as text; blank means zero, not invalid. */
function toNumber(value: string): number {
  const trimmed = value.trim();
  return trimmed.length === 0 ? 0 : Number(trimmed);
}

const optionalNumber = z
  .string()
  .refine((value) => value.trim().length === 0 || Number.isFinite(Number(value)), 'Numbers only.');

const newFoodSchema = z.object({
  name: z.string().trim().min(1, 'Give the food a name.'),
  brand: z.string(),
  servingLabel: z.string(),
  barcode: z.string(),
  kcal: z
    .string()
    .refine((value) => value.trim().length > 0, 'Calories are required.')
    .refine((value) => Number.isFinite(Number(value)), 'Calories must be a number.')
    .refine((value) => Number(value) >= 0, 'Calories cannot be negative.'),
  protein: optionalNumber,
  carbs: optionalNumber,
  fat: optionalNumber,
});

type NewFoodValues = z.infer<typeof newFoodSchema>;

export default function NewFoodForm() {
  const router = useRouter();
  const showToast = useUiStore((state) => state.showToast);
  const { mutateAsync, isPending } = useCreateFoodMutation();
  const [save, setSave] = useState(true);

  const form = useForm<NewFoodValues>({
    resolver: zodResolver(newFoodSchema),
    defaultValues: {
      name: '',
      brand: '',
      servingLabel: '',
      barcode: '',
      kcal: '',
      protein: '',
      carbs: '',
      fat: '',
    },
  });

  const onSubmit = useCallback(
    async (values: NewFoodValues) => {
      try {
        await mutateAsync({
          name: values.name.trim(),
          brand: values.brand.trim(),
          servingLabel: values.servingLabel.trim(),
          kcal: toNumber(values.kcal),
          protein: toNumber(values.protein),
          carbs: toNumber(values.carbs),
          fat: toNumber(values.fat),
          save,
        });
        router.back();
      } catch (error) {
        showToast(errorMessage(error), 'danger');
      }
    },
    [mutateAsync, router, save, showToast],
  );

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="gap-4 px-4 pb-10 pt-2"
      keyboardShouldPersistTaps="handled"
    >
      <LIForm form={form}>
        <LICard className="gap-3">
          <NewFoodFieldRow<NewFoodValues> name="name" label="Name" placeholder="Greek yoghurt" />
          <NewFoodFieldRow<NewFoodValues>
            name="brand"
            label="Brand"
            placeholder="Fage"
            optional
          />
          <NewFoodFieldRow<NewFoodValues>
            name="servingLabel"
            label="Serving"
            placeholder="170 g"
          />
          <NewFoodFieldRow<NewFoodValues>
            name="barcode"
            label="Barcode"
            placeholder="Scan or type"
            optional
            keyboardType="numeric"
            autoCapitalize="none"
          />
        </LICard>

        <NewFoodMacroGrid<NewFoodValues>
          kcalName="kcal"
          proteinName="protein"
          carbsName="carbs"
          fatName="fat"
        />

        <LICard className="flex-row items-center gap-3">
          <View className="flex-1 gap-0.5">
            <LIText
              size="p"
              color="primary"
              text="Save to my foods"
              className="font-geist-medium"
            />
            <LIText
              size="caption"
              color="muted"
              text={save ? 'Saved to your foods' : 'Just this once'}
              className="font-geist"
            />
          </View>
          <LISwitch value={save} onValueChange={setSave} testID="new-food-save" />
        </LICard>

        <LIButton
          title="Add to today"
          onPress={form.handleSubmit(onSubmit)}
          loading={isPending}
          fullWidth
          testID="new-food-submit"
        />
      </LIForm>

      <LIText
        size="caption"
        color="muted"
        text="Custom foods belong to your profile, not to a coach or a database."
        className="text-center font-geist"
      />
    </ScrollView>
  );
}
