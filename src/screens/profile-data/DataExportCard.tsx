import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { useRunExportMutation } from '@/api/clientProfile';
import { LIButton, LICard, LISegmented, LISwitch, LIText } from '@/components/ui';
import { useUiStore } from '@/store/uiStore';

const FORMATS = [
  { label: 'JSON', value: 'json' },
  { label: 'CSV', value: 'csv' },
  { label: 'PDF', value: 'pdf' },
] as const;

/** What each format is actually good for — the choice is otherwise opaque. */
const FORMAT_NOTES: Record<string, string> = {
  json: 'Complete and machine-readable. Best for moving to another app.',
  csv: 'One row per set and meal. Opens in any spreadsheet.',
  pdf: 'A readable archive to keep or print. Not meant for importing.',
};

interface DataExportCardProps {
  readonly lastExport: string;
}

export default function DataExportCard({ lastExport }: DataExportCardProps) {
  // Local to this card — nothing else in the app needs the pending choice.
  const [format, setFormat] = useState<string>('json');
  const [includePrograms, setIncludePrograms] = useState(true);

  const showToast = useUiStore((state) => state.showToast);
  const runExport = useRunExportMutation();

  const submit = useCallback(() => {
    runExport.mutate(
      { format, includePrograms },
      { onSuccess: () => showToast('Export ready', 'success') },
    );
  }, [runExport, format, includePrograms, showToast]);

  return (
    <LICard className="gap-3">
      <LIText size="caption" color="muted" text="Export format" className="font-geist-medium" />

      <LISegmented
        options={FORMATS}
        value={format}
        onChange={setFormat}
        testID="export-format"
      />

      <LIText
        size="caption"
        color="muted"
        text={FORMAT_NOTES[format] ?? ''}
        className="font-geist"
      />

      <View className="flex-row items-center gap-3 border-t border-border pt-3">
        <View className="flex-1 gap-0.5">
          <LIText
            size="p"
            color="primary"
            text="Include coach-authored programs"
            className="font-geist-medium"
          />
          <LIText
            size="caption"
            color="muted"
            text={
              includePrograms
                ? 'Programs written for you are in the archive.'
                : 'Only what you logged yourself.'
            }
            className="font-geist"
          />
        </View>
        <LISwitch
          value={includePrograms}
          onValueChange={setIncludePrograms}
          testID="export-include-programs"
        />
      </View>

      <LIButton
        title="Export my data"
        fullWidth
        loading={runExport.isPending}
        onPress={submit}
        testID="export-submit"
      />

      <LIText
        size="caption"
        color="muted"
        text={lastExport}
        className="text-center font-geist"
      />
    </LICard>
  );
}
