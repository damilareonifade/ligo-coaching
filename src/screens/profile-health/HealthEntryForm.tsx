import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { LIButton, LIChip, LIInput, LIText } from '@/components/ui';
import {
  healthSectionCopy,
  INJURY_STATUSES,
  supportsStatus,
  type HealthSection,
  type InjuryStatus,
} from '@/lib/health';

interface HealthEntryFormProps {
  readonly section: HealthSection;
  readonly onSave: (label: string, value: string, status: InjuryStatus | null) => void;
  readonly onCancel: () => void;
  readonly saving: boolean;
}

/**
 * Adding one entry, inline under its own section.
 *
 * Inline rather than a screen or a sheet because it is two short fields and
 * the context — which card it lands in — is the thing above it. A separate
 * screen would have to restate the section in a title.
 *
 * The status chips appear only on injuries. A status on a prescription would
 * be a badge nobody chose the meaning of, and the database refuses it anyway.
 */
export default function HealthEntryForm({
  section,
  onSave,
  onCancel,
  saving,
}: HealthEntryFormProps) {
  const copy = healthSectionCopy(section);
  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<InjuryStatus | null>(null);

  const save = useCallback(() => {
    if (label.trim().length === 0) return;
    onSave(label, value, status);
  }, [label, onSave, status, value]);

  return (
    <View className="gap-3 rounded-card bg-white p-4" testID={`health-form-${section}`}>
      <LIInput
        label="What"
        labelClassName="text-ink"
        value={label}
        onChangeText={setLabel}
        placeholder={copy.labelHint}
        autoFocus
        testID={`health-label-${section}`}
      />
      <LIInput
        label="Detail"
        labelClassName="text-ink"
        value={value}
        onChangeText={setValue}
        placeholder={copy.valueHint}
        multiline
        testID={`health-value-${section}`}
      />

      {supportsStatus(section) ? (
        <View className="gap-2">
          <LIText
            size="caption"
            color="muted"
            text="Status"
            className="font-geist-medium"
          />
          <View className="flex-row flex-wrap gap-2">
            {INJURY_STATUSES.map((option) => (
              <LIChip
                key={option}
                label={option}
                selected={status === option}
                onPress={() => setStatus(status === option ? null : option)}
                testID={`health-status-${option}`}
              />
            ))}
          </View>
        </View>
      ) : null}

      <View className="flex-row gap-2">
        <LIButton
          title="Cancel"
          onPress={onCancel}
          variant="ghost"
          className="flex-1"
          labelClassName="text-dark-gray"
        />
        <LIButton
          title="Save"
          onPress={save}
          disabled={label.trim().length === 0}
          loading={saving}
          className="flex-1"
          testID={`health-save-${section}`}
        />
      </View>
    </View>
  );
}
