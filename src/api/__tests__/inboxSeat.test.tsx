import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useInboxQuery } from '@/api/coachMessages';
import { supabase } from '@/api/supabase';

jest.mock('@/lib/env', () => ({
  env: {
    apiUrl: 'https://api.example.com',
    useMocks: false,
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'sb_publishable_test',
  },
}));

const getSession = jest.spyOn(supabase.auth, 'getSession');
const rpc = jest.spyOn(supabase, 'rpc');

/** One direct thread between a coach and a client, as `my_threads` returns it. */
const THREAD = {
  thread_id: 't-1',
  kind: 'direct',
  coach_id: 'coach-1',
  client_id: 'client-1',
  coach_name: 'Priya B.',
  client_name: 'Maya A.',
  coach_gym: null,
  coach_specialties: [],
  // Everything shared. The client set these; they say nothing about the coach.
  permissions: { workouts: true, nutrition: true, metrics: true, health: true, monthly: true },
  archived: false,
  last_body: 'See you Thursday',
  last_at: '2026-09-18T09:00:00Z',
  unread: false,
};

function wrapper({ children }: { readonly children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function signedInAs(id: string) {
  getSession.mockResolvedValue({
    data: { session: { user: { id } } },
    error: null,
  } as never);
  rpc.mockResolvedValue({ data: [THREAD], error: null, status: 200 } as never);
}

async function inbox() {
  // `renderHook` is async in @testing-library/react-native v14, like `render`.
  const { result } = await renderHook(() => useInboxQuery(''), { wrapper });
  await waitFor(() => expect(result.current.data).toBeDefined());
  return result.current.data ?? [];
}

beforeEach(() => jest.clearAllMocks());

/**
 * One list, read from either end.
 *
 * The inbox was written for a coach and assumed it: every row was a client,
 * named by `client_name`, described by what that client shares. Handing the
 * Messages tab to clients pointed the same query at the other seat, where each
 * of those assumptions is wrong about a different thing.
 */
describe('the inbox from each seat', () => {
  it('names the client when a coach is reading', async () => {
    signedInAs('coach-1');

    const [row] = await inbox();

    expect(row?.name).toBe('Maya A.');
    // Where the thread goes: the coach's route is per-client.
    expect(row?.clientId).toBe('client-1');
  });

  it('names the coach when a client is reading, not themselves', async () => {
    signedInAs('client-1');

    const [row] = await inbox();

    // Without this the row read "Maya A." to Maya — her own name, on the
    // conversation she is having with somebody else.
    expect(row?.name).toBe('Priya B.');
    expect(row?.clientId).toBe('coach-1');
  });

  it('says whose sharing the row is describing', async () => {
    signedInAs('coach-1');
    const [coachRow] = await inbox();
    expect(coachRow?.accessLabel).toBe('Full access');

    signedInAs('client-1');
    const [clientRow] = await inbox();

    // Same permissions, other end. "Full access" under a coach's name reads as
    // a claim about the coach — the one person these switches are not about.
    expect(clientRow?.accessLabel).toBe('You share everything with them');
  });
});
