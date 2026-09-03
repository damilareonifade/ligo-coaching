import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { z } from 'zod';

import { errorMessage } from '@/api/client';
import { useCreateExerciseMutation } from '@/api/coachPrograms';
import { LIForm, LIFormField, LIFormInput } from '@/components/LIForm';
import { LIButton, LICard, LIChipGroup, LIInput, LIText } from '@/components/ui';
import { useAddExerciseToTarget } from '@/hooks/useAddExerciseToTarget';
import { useUiStore } from '@/store/uiStore';

import { EQUIPMENT_OPTIONS, MUSCLE_OPTIONS, TRACKS_OPTIONS } from './options';

const newExerciseSchema = z.object({
  name: z.string().trim().min(1, 'Give the exercise a name.'),
  muscle: z.string().min(1, 'Pick the muscle it trains.'),
  equipment: z.string().min(1, 'Pick the equipment it needs.'),
  tracks: z.string().min(1, 'Pick what the client logs against it.'),
  note: z.string(),
});

type NewExerciseValues = z.infer<typeof newExerciseSchema>;

/**
 * `LIForm` provides no keyboard avoidance, so the screen owns it — the form
 * note is the last field on a scroll and would otherwise sit under the keyboard.
 */
export default function NewExerciseForm() {
  const router = useRouter();
  const { programId, dayId } = useLocalSearchParams<{ programId?: string; dayId?: string }>();
  const { addExercise } = useAddExerciseToTarget({ programId, dayId });
  const showToast = useUiStore((state) => state.showToast);
  const { mutateAsync, isPending } = useCreateExerciseMutation();

  const form = useForm<NewExerciseValues>({
    resolver: zodResolver(newExerciseSchema),
    // Nothing is pre-picked: a default muscle would be a guess the coach then
    // has to notice and undo.
    defaultValues: { name: '', muscle: '', equipment: '', tracks: '', note: '' },
  });

  const onSubmit = useCallback(
    async (values: NewExerciseValues) => {
      try {
        await mutateAsync({
          name: values.name.trim(),
          muscle: values.muscle,
          equipment: values.equipment,
          tracks: values.tracks,
          note: values.note.trim(),
        });
        // The button says "Save and add", so it adds. Landing back on the
        // picker with the exercise merely listed would make the coach hunt for
        // what they just created.
        addExercise(values.name.trim());
        // Past the picker too — the decision it existed to make is made.
        router.back();
        router.back();
      } catch (error) {
        showToast(errorMessage(error), 'danger');
      }
    },
    [mutateAsync, router, showToast, addExercise],
  );

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 px-4 pb-10 pt-2"
        keyboardShouldPersistTaps="handled"
      >
        <LIForm form={form}>
          <LICard className="gap-4">
            <LIFormInput<NewExerciseValues>
              name="name"
              label="Name"
              placeholder="Front foot elevated split squat"
            />
          </LICard>

          <LICard className="gap-4">
            <LIFormField<NewExerciseValues>
              name="muscle"
              render={(field) => (
                <LIChipGroup
                  label="Muscle"
                  options={MUSCLE_OPTIONS}
                  value={typeof field.value === 'string' ? field.value : ''}
                  onChange={field.onChange}
                  testID="new-exercise-muscle"
                />
              )}
            />
            <LIFormField<NewExerciseValues>
              name="equipment"
              render={(field) => (
                <LIChipGroup
                  label="Equipment"
                  options={EQUIPMENT_OPTIONS}
                  value={typeof field.value === 'string' ? field.value : ''}
                  onChange={field.onChange}
                  testID="new-exercise-equipment"
                />
              )}
            />
            <LIFormField<NewExerciseValues>
              name="tracks"
              render={(field) => (
                <LIChipGroup
                  label="Tracks"
                  options={TRACKS_OPTIONS}
                  value={typeof field.value === 'string' ? field.value : ''}
                  onChange={field.onChange}
                  testID="new-exercise-tracks"
                />
              )}
            />
          </LICard>

          <LICard>
            <LIFormField<NewExerciseValues>
              name="note"
              render={(field) => (
                <LIInput
                  label="Form note"
                  placeholder="The one thing to remember. e.g. Front foot elevated, torso upright."
                  value={typeof field.value === 'string' ? field.value : ''}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  // The field row is a fixed height by default; a cue is two or
                  // three lines, so this one grows and pins its text to the top.
                  fieldClassName="h-24 items-start py-3"
                  accessibilityLabel="Form note"
                  testID="new-exercise-note"
                />
              )}
            />
          </LICard>

          <LIButton
            title="Save and add"
            onPress={form.handleSubmit(onSubmit)}
            loading={isPending}
            fullWidth
            testID="new-exercise-submit"
          />
        </LIForm>

        <LIText
          size="caption"
          color="muted"
          text="Custom exercises belong to your library. Clients see the name and your form note, never the catalogue."
          className="text-center font-geist"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
