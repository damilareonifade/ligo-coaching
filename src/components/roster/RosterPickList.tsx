import { memo, useCallback } from 'react';
import { View } from 'react-native';

import type { ApiRosterClient } from '@/api/types';
import { LIAvatar, LICheckbox, LIText } from '@/components/ui';
import { cn } from '@/lib/utils';

interface RosterPickRowProps {
  readonly client: ApiRosterClient;
  readonly selected: boolean;
  readonly onToggle: (clientId: string) => void;
  readonly divided: boolean;
}

function RosterPickRowBase({ client, selected, onToggle, divided }: RosterPickRowProps) {
  const toggle = useCallback(() => onToggle(client.id), [onToggle, client.id]);

  return (
    <View
      className={cn('flex-row items-center gap-3 py-3', divided && 'border-t border-border')}
    >
      <LICheckbox
        checked={selected}
        onChange={toggle}
        accessibilityLabel={`Invite ${client.name}`}
        testID={`pick-${client.id}`}
      />
      <LIAvatar name={client.name} size="sm" />
      <View className="flex-1 gap-0.5">
        <LIText
          size="p"
          color="primary"
          text={client.name}
          numberOfLines={1}
          className="font-geist-medium"
        />
        <LIText
          size="caption"
          color="muted"
          text={client.meta}
          numberOfLines={1}
          className="font-geist"
        />
      </View>
    </View>
  );
}

const RosterPickRow = memo(RosterPickRowBase);

interface RosterPickListProps {
  readonly clients: readonly ApiRosterClient[];
  readonly selectedIds: readonly string[];
  readonly onToggle: (clientId: string) => void;
  readonly onClear: () => void;
  readonly label: string;
}

/**
 * The coach's roster as a list of people to *ask*. Shared by both creators so
 * the group and the board invite from the same list in the same way.
 *
 * There is deliberately no "select all". Inviting forty people is one tap away
 * from being a decision nobody made, and the count on the summary card below
 * only means something if the coach assembled it.
 *
 * A plain mapped View rather than `LIList`: it is nested inside the screen's
 * scroll view, and a virtualised list inside a scroll view of the same axis
 * measures to nothing.
 */
export default function RosterPickList({
  clients,
  selectedIds,
  onToggle,
  onClear,
  label,
}: RosterPickListProps) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2 px-1">
        <LIText
          size="caption"
          color="muted"
          text={label.toUpperCase()}
          className="font-geist-medium tracking-wide"
        />
        <View className="flex-1" />
        {selectedIds.length > 0 ? (
          <LIText
            size="caption"
            color="accent"
            text="Clear"
            className="font-geist-medium"
            handleClick={onClear}
            testID="pick-clear"
          />
        ) : null}
      </View>

      <View className="rounded-card bg-surface px-4">
        {clients.length === 0 ? (
          <View className="py-4">
            <LIText
              size="caption"
              color="muted"
              text="No clients on your roster yet. Invite one from the Roster tab first."
              className="font-geist"
            />
          </View>
        ) : (
          clients.map((client, index) => (
            <RosterPickRow
              key={client.id}
              client={client}
              selected={selectedIds.includes(client.id)}
              onToggle={onToggle}
              divided={index > 0}
            />
          ))
        )}
      </View>
    </View>
  );
}
