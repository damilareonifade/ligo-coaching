import type { ReactNode } from 'react';
import { View } from 'react-native';

import { LIDivider, LIEmptyState, LIText } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface LIColumn<TRow> {
  readonly key: string;
  readonly header: string;
  /** Flex weight for the column. Defaults to 1. */
  readonly flex?: number;
  readonly render: (row: TRow) => ReactNode;
}

export interface LITableProps<TRow> {
  readonly columns: readonly LIColumn<TRow>[];
  readonly data: readonly TRow[];
  readonly keyExtractor: (row: TRow) => string;
  readonly emptyMessage?: string;
  readonly className?: string;
}

/**
 * For bounded row counts (a program's exercises, a session's sets) — rows are
 * mapped, not virtualised. Anything unbounded belongs in `LIList`.
 */
export function LITable<TRow>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'Nothing here yet.',
  className,
}: LITableProps<TRow>) {
  if (data.length === 0) {
    return <LIEmptyState title="Empty" message={emptyMessage} />;
  }

  return (
    <View className={cn('overflow-hidden rounded-card bg-surface', className)}>
      <View className="flex-row bg-surface-sunken px-4 py-3">
        {columns.map((column) => (
          <View key={column.key} style={{ flex: column.flex ?? 1 }}>
            <LIText size="caption" color="primary" text={column.header} className="font-semibold" />
          </View>
        ))}
      </View>

      {data.map((row, index) => (
        <View key={keyExtractor(row)}>
          {index > 0 ? <LIDivider /> : null}
          <View className="flex-row items-center px-4 py-3">
            {columns.map((column) => (
              <View key={column.key} style={{ flex: column.flex ?? 1 }}>
                {column.render(row)}
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
