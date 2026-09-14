import { supabase } from '@/api/supabase';
import { fetchOwnProfile } from '@/api/users';

const getSession = jest.spyOn(supabase.auth, 'getSession');
const from = jest.spyOn(supabase, 'from');

/** A stand-in for the PostgREST builder: every filter returns itself. */
function builder(result: unknown) {
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'limit', 'order']) {
    chain[method] = jest.fn(() => chain);
  }
  chain.maybeSingle = jest.fn(() => Promise.resolve(result));
  return chain;
}

const ROW = {
  id: 'me',
  email: 'me@example.com',
  full_name: 'Me',
  avatar_url: null,
  role: 'client',
  role_confirmed: true,
  onboarded_at: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  getSession.mockResolvedValue({
    data: { session: { user: { id: 'me' } } },
    error: null,
  } as never);
});

/**
 * This asked for `select(COLUMNS).limit(1)` and trusted RLS to mean "mine".
 *
 * It does not. `users_select_linked` makes a client's coach visible to them
 * and every client visible to their coach, so with no ORDER BY the first row
 * back could be anybody they are linked to — and the app took it as their own
 * identity, role included. A client attached to a coach was signed in as the
 * coach.
 */
describe('fetchOwnProfile', () => {
  it('asks for its own row by id, never whichever row RLS returns first', async () => {
    const chain = builder({ data: ROW, error: null, status: 200 });
    from.mockReturnValue(chain as never);

    await fetchOwnProfile();

    expect(from).toHaveBeenCalledWith('users');
    // The assertion that matters. Without this filter the query returns every
    // row the caller may see, and `limit(1)` picks one at random.
    expect(chain.eq).toHaveBeenCalledWith('id', 'me');
  });

  it('refuses to guess when there is no session', async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null } as never);
    from.mockReturnValue(builder({ data: ROW, error: null, status: 200 }) as never);

    await expect(fetchOwnProfile()).rejects.toThrow('You are not signed in.');
  });
});
