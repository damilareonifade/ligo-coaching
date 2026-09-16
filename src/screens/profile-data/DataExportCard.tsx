import { useCallback, useState } from 'react';
import { Linking } from 'react-native';

import { useRunExportMutation } from '@/api/clientProfile';
import { LIButton, LICard, LISegmented, LIText } from '@/components/ui';
import { errorMessage } from '@/api/client';
import { useUiStore } from '@/store/uiStore';

/**
 * PDF was here and produced nothing — the export only ever wrote JSON, so two
 * of the three choices were decoration. It is gone rather than built: a
 * rendering pipeline is real work for something nobody does with a training
 * history, and an option that does nothing is worse than an option that is
 * absent.
 */
const FORMATS = [
  { label: 'JSON', value: 'json' },
  { label: 'CSV', value: 'csv' },
] as const;

/** What each is actually good for — the choice is otherwise opaque. */
const FORMAT_NOTES: Record<string, string> = {
  json: 'Everything, and machine-readable. Best for moving to another app.',
  // Says what it holds rather than what it is, because "CSV" does not tell
  // anybody that their check-ins are not in it.
  csv: 'Your logged sets, one per row. Opens in any spreadsheet.',
};

interface DataExportCardProps {
  readonly lastExport: string;
}

export default function DataExportCard({ lastExport }: DataExportCardProps) {
  // Local to this card — nothing else in the app needs the pending choice.
  const [format, setFormat] = useState<string>('json');

  const showToast = useUiStore((state) => state.showToast);
  const runExport = useRunExportMutation();

  const submit = useCallback(() => {
    runExport.mutate(
      { format },
      {
        /**
         * Opened, not announced. The link is signed and expires within the
         * hour, so a toast saying "ready" would leave somebody hunting for a
         * file that is quietly rotting — the browser takes it straight to
         * their downloads instead.
         */
        onSuccess: (url) => {
          void Linking.openURL(url).catch(() =>
            showToast('The export is ready but could not be opened.', 'danger'),
          );
        },
        onError: (error) => showToast(errorMessage(error), 'danger'),
      },
    );
  }, [runExport, format, showToast]);

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

      {/* "Include coach-authored programs" was a switch here that changed
          nothing — the export ignored it. It is gone rather than wired up,
          because it could never have been true either way: a coach's programs
          are the coach's, and the copies assigned to you are yours and are
          always included. There was no second answer for it to give. */}
      <LIText
        size="caption"
        color="muted"
        text="Includes the routines assigned to you. Programs your coach wrote stay theirs."
        className="border-t border-border pt-3 font-geist"
      />

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
