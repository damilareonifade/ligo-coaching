import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { z } from 'zod';

import { errorMessage } from '@/api/client';
import { useSaveCheckInMutation } from '@/api/clientCheckIns';
import type { ApiCheckIn, ApiMonthlyCheckIns } from '@/api/types';
import { LIForm, LIFormField } from '@/components/LIForm';
import { LIButton, LICard, LIInput, LIText } from '@/components/ui';
import { useUnits } from '@/hooks/useUnits';
import { useUiStore } from '@/store/uiStore';

import CheckInEditHeader from './CheckInEditHeader';
import CheckInFieldRow from './CheckInFieldRow';
import CheckInPhotoRow from './CheckInPhotoRow';

/** Cells arrive display-ready ("78 cm", "16.8%"); the field wants the number back. */
function rawValue(entry: ApiCheckIn | null, label: string): string {
  const cell = entry?.cells.find((item) => item.label === label);
  if (!cell) return '';
  const digits = cell.value.replace(/[^\d.]/g, '');
  return digits;
}

const optionalNumber = z
  .string()
  .refine((value) => value.trim().length === 0 || Number.isFinite(Number(value)), 'Numbers only.')
  .refine(
    (value) => value.trim().length === 0 || Number(value) > 0,
    'Must be more than zero.',
  );

const checkInSchema = z.object({
  weightKg: z
    .string()
    .refine((value) => value.trim().length > 0, 'Weight is required.')
    .refine((value) => Number.isFinite(Number(value)), 'Weight must be a number.')
    .refine((value) => Number(value) > 0, 'Weight must be more than zero.'),
  waist: optionalNumber,
  chest: optionalNumber,
  hips: optionalNumber,
  bodyFat: optionalNumber,
  note: z.string(),
});

type CheckInValues = z.infer<typeof checkInSchema>;

interface CheckInEditFormProps {
  readonly checkIns: ApiMonthlyCheckIns;
  /** Present when editing an existing month; absent when logging a new one. */
  readonly id?: string;
  /**
   * Whose. Set when a coach is logging for a client — absent is the client's
   * own. It rides into the save so the row lands on the right person, and the
   * database stamps who wrote it either way.
   */
  readonly clientId?: string;
}

/**
 * A numeric field, between what is stored and what is shown.
 *
 * Empty stays empty — a blank measurement is "not taken", and running it
 * through a conversion would turn it into a zero somebody never recorded.
 */
function convertField(raw: string, convert: (value: number) => number): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return '';
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return raw;
  return String(Number(convert(parsed).toFixed(1)));
}

export default function CheckInEditForm({
  checkIns,
  id,
  clientId,
}: CheckInEditFormProps) {
  const router = useRouter();
  const units = useUnits();
  const showToast = useUiStore((state) => state.showToast);
  const { mutateAsync, isPending } = useSaveCheckInMutation();

  const entry = id ? (checkIns.entries.find((item) => item.id === id) ?? null) : null;
  // Hoisted: the React Compiler cannot track `entry?.id` as a dependency.
  const entryId = entry?.id;

  const form = useForm<CheckInValues>({
    resolver: zodResolver(checkInSchema),
    // Stored in kilograms and centimetres; shown in whatever was chosen.
    defaultValues: {
      weightKg: convertField(entry?.weightKg ?? '', units.displayWeight),
      waist: convertField(rawValue(entry, 'Waist'), units.displayLength),
      chest: convertField(rawValue(entry, 'Chest'), units.displayLength),
      hips: convertField(rawValue(entry, 'Hips'), units.displayLength),
      // A percentage is a percentage in every gym on earth.
      bodyFat: rawValue(entry, 'Body fat'),
      note: entry?.note ?? '',
    },
  });

  const onSubmit = useCallback(
    async (values: CheckInValues) => {
      try {
        // Back to kilograms and centimetres. Without this a client on pounds
        // logging 185 would have 185 kg written down, and the constraint that
        // catches a 10 cm waist would not catch it.
        await mutateAsync({
          id: entryId,
          clientId,
          ...values,
          weightKg: convertField(values.weightKg, units.storedWeight),
          waist: convertField(values.waist, units.storedLength),
          chest: convertField(values.chest, units.storedLength),
          hips: convertField(values.hips, units.storedLength),
        });
        router.back();
      } catch (error) {
        showToast(errorMessage(error), 'danger');
      }
    },
    [clientId, entryId, mutateAsync, router, showToast, units],
  );

  const cancel = useCallback(() => router.back(), [router]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 px-4 pb-10 pt-2"
        keyboardShouldPersistTaps="handled"
      >
        <CheckInEditHeader title={entry ? `Edit ${entry.label}` : 'Log this month'} />

        <LIForm form={form}>
          <LICard className="gap-3">
            <CheckInFieldRow<CheckInValues> name="weightKg" label="Weight" unit={units.weight} />
            <CheckInFieldRow<CheckInValues> name="waist" label="Waist" unit={units.length} />
            <CheckInFieldRow<CheckInValues> name="chest" label="Chest" unit={units.length} />
            <CheckInFieldRow<CheckInValues> name="hips" label="Hips" unit={units.length} />
            <CheckInFieldRow<CheckInValues> name="bodyFat" label="Body fat" unit="%" />
          </LICard>

          <LICard className="gap-2">
            <LIText size="caption" color="primary" text="Note" className="font-geist-semibold" />
            <LIFormField<CheckInValues>
              name="note"
              render={(field) => (
                <LIInput
                  variant="filled"
                  placeholder="What changed this month"
                  value={typeof field.value === 'string' ? field.value : ''}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  multiline
                  textAlignVertical="top"
                  // The field is a fixed 48px row by default; a note needs to grow.
                  fieldClassName="h-auto min-h-[84px] items-start py-3"
                  accessibilityLabel="Note"
                  testID="check-in-note"
                />
              )}
            />
          </LICard>

          <CheckInPhotoRow photos={entry?.photos ?? 0} />

          <View className="gap-3">
            <LIButton
              title="Save check-in"
              onPress={form.handleSubmit(onSubmit)}
              loading={isPending}
              fullWidth
              testID="check-in-save"
            />
            <LIButton
              title="Cancel"
              variant="outline"
              onPress={cancel}
              fullWidth
              testID="check-in-cancel"
            />
          </View>
        </LIForm>

        <LIText
          size="caption"
          color="muted"
          text={`Edits are attributed. ${checkIns.coachName} sees who changed what and when.`}
          className="text-center font-geist"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
