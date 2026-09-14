import { fireEvent, render, screen } from '@testing-library/react-native';

import type { ApiAccessRequest } from '@/api/types';
import { accessRequestBody, accessRequestTitle } from '@/lib/sharing';
import AccessRequestList from '@/screens/profile/AccessRequestList';

const mockAnswer = jest.fn();

jest.mock('@/api/clientProfile', () => ({
  useAnswerAccessRequestMutation: () => ({ mutate: mockAnswer, isPending: false }),
}));

function request(id: string, domain: ApiAccessRequest['domain']): ApiAccessRequest {
  return {
    id,
    coachName: 'Sam',
    domain,
    title: accessRequestTitle('Sam', domain),
    body: accessRequestBody(domain),
    when: '2h',
  };
}

beforeEach(() => {
  mockAnswer.mockClear();
});

/**
 * The client's half of the coach's "Request access" button, which until now
 * did not exist — the request went nowhere and nobody was ever asked.
 */
describe('AccessRequestList', () => {
  it('renders nothing at all when nobody has asked for anything', async () => {
    await render(<AccessRequestList requests={[]} />);
    expect(screen.queryByTestId('access-requests')).toBeNull();
  });

  it('names what is being asked for, and who is asking', async () => {
    await render(<AccessRequestList requests={[request('r1', 'health')]} />);
    expect(screen.getByText('Sam is asking to see your health profile')).toBeTruthy();
  });

  it('offers both answers, neither of them hidden', async () => {
    await render(<AccessRequestList requests={[request('r1', 'nutrition')]} />);
    expect(screen.getByTestId('access-grant-nutrition')).toBeTruthy();
    expect(screen.getByTestId('access-decline-nutrition')).toBeTruthy();
  });

  it('shares only when the client says to', async () => {
    await render(<AccessRequestList requests={[request('r1', 'metrics')]} />);

    await fireEvent.press(screen.getByTestId('access-grant-metrics'));
    expect(mockAnswer).toHaveBeenCalledWith(
      { requestId: 'r1', grant: true },
      expect.anything(),
    );
  });

  it('treats a refusal as a real answer rather than a dismissal', async () => {
    await render(<AccessRequestList requests={[request('r1', 'metrics')]} />);

    await fireEvent.press(screen.getByTestId('access-decline-metrics'));
    expect(mockAnswer).toHaveBeenCalledWith(
      { requestId: 'r1', grant: false },
      expect.anything(),
    );
  });

  it('counts them when more than one is waiting', async () => {
    await render(
      <AccessRequestList requests={[request('r1', 'health'), request('r2', 'monthly')]} />,
    );
    expect(screen.getByText('WAITING ON YOU · 2')).toBeTruthy();
  });
});
