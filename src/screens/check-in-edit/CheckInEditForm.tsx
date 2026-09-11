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
}

export default function CheckInEditForm({ checkIns, id }: CheckInEditFormProps) {
  const router = useRouter();
  const showToast = useUiStore((state) => state.showToast);
  const { mutateAsync, isPending } = useSaveCheckInMutation();

  const entry = id ? (checkIns.entries.find((item) => item.id === id) ?? null) : null;
  // Hoisted: the React Compiler cannot track `entry?.id` as a dependency.
  const entryId = entry?.id;

  const form = useForm<CheckInValues>({
    resolver: zodResolver(checkInSchema),
    defaultValues: {
      weightKg: entry?.weightKg ?? '',
      waist: rawValue(entry, 'Waist'),
      chest: rawValue(entry, 'Chest'),
      hips: rawValue(entry, 'Hips'),
      bodyFat: rawValue(entry, 'Body fat'),
      note: entry?.note ?? '',
    },
  });

  const onSubmit = useCallback(
    async (values: CheckInValues) => {
      try {
        await mutateAsync({ id: entryId, ...values });
        router.back();
      } catch (error) {
        showToast(errorMessage(error), 'danger');
      }
    },
    [entryId, mutateAsync, router, showToast],
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
            <CheckInFieldRow<CheckInValues> name="weightKg" label="Weight" unit="kg" />
            <CheckInFieldRow<CheckInValues> name="waist" label="Waist" unit="cm" />
            <CheckInFieldRow<CheckInValues> name="chest" label="Chest" unit="cm" />
            <CheckInFieldRow<CheckInValues> name="hips" label="Hips" unit="cm" />
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
