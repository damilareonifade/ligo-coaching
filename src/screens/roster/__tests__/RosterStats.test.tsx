import { render, screen } from '@testing-library/react-native';

import type { ApiStudent } from '@/api/types';
import RosterStats from '@/screens/roster/RosterStats';

function student(overrides: Partial<ApiStudent>): ApiStudent {
  return {
    id: 'stu-x',
    name: 'Test Student',
    avatarUrl: null,
    goal: 'Get stronger',
    programId: null,
    status: 'on-track',
    adherence: 80,
    nextSessionAt: null,
    lastSessionAt: null,
    note: null,
    ...overrides,
  };
}

describe('RosterStats', () => {
  it('counts active students and averages adherence, ignoring inactive ones', async () => {
    await render(
      <RosterStats
        students={[
          student({ id: 'a', adherence: 90 }),
          student({ id: 'b', status: 'at-risk', adherence: 50 }),
          student({ id: 'c', status: 'inactive', adherence: 0 }),
        ]}
      />,
    );

    expect(screen.getByText('2')).toBeTruthy(); // active
    expect(screen.getByText('70%')).toBeTruthy(); // avg of 90 and 50
  });

  it('reports zero adherence with no active students', async () => {
    await render(<RosterStats students={[student({ status: 'inactive' })]} />);
    expect(screen.getByText('0%')).toBeTruthy();
  });
});
