import { fireEvent, render, screen } from '@testing-library/react-native';

import type { ApiRosterStat } from '@/api/types';
import RosterStats from '@/screens/roster/RosterStats';

/**
 * The contract changed with the roster rebuild: the tiles no longer derive
 * anything from a student list, they display the roster's own KPIs and act as
 * the filter behind each number. That second half is the part worth a test —
 * a KPI you cannot tap through to is just decoration.
 */
const stats: readonly ApiRosterStat[] = [
  { id: 'clients', label: 'Clients', value: '18' },
  { id: 'review', label: 'Need a look', value: '2' },
  { id: 'live', label: 'Training now', value: '1' },
];

describe('RosterStats', () => {
  it('renders every KPI it is given', async () => {
    await render(<RosterStats stats={stats} selected="all" onSelect={() => {}} />);

    expect(screen.getByText('18')).toBeTruthy();
    expect(screen.getByText('Clients')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('Need a look')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('Training now')).toBeTruthy();
  });

  it('filters to the state a tile stands for', async () => {
    const onSelect = jest.fn();
    await render(<RosterStats stats={stats} selected="all" onSelect={onSelect} />);

    await fireEvent.press(screen.getByTestId('roster-stat-review'));
    expect(onSelect).toHaveBeenCalledWith('review');

    await fireEvent.press(screen.getByTestId('roster-stat-live'));
    expect(onSelect).toHaveBeenCalledWith('live');
  });

  it('clears the filter from the Clients tile', async () => {
    const onSelect = jest.fn();
    await render(<RosterStats stats={stats} selected="review" onSelect={onSelect} />);

    await fireEvent.press(screen.getByTestId('roster-stat-clients'));
    expect(onSelect).toHaveBeenCalledWith('all');
  });
});
