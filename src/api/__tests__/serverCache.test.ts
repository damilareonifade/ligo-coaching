import { cacheKeys, readCache, writeCache } from '@/api/serverCache';
import { supabase } from '@/api/supabase';

const getSession = jest.spyOn(supabase.auth, 'getSession');
const from = jest.spyOn(supabase, 'from');

/** A stand-in for the PostgREST builder: every filter returns itself. */
function builder(result: unknown) {
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'is', 'order', 'limit']) {
    chain[method] = jest.fn(() => chain);
  }
  chain.maybeSingle = jest.fn(() => Promise.resolve(result));
  chain.upsert = jest.fn(() => Promise.resolve({ error: null, status: 200 }));
  chain.delete = jest.fn(() => chain);
  return chain;
}

beforeEach(() => {
  jest.clearAllMocks();
  getSession.mockResolvedValue({
    data: { session: { user: { id: 'user-1' } } },
    error: null,
  } as never);
});

describe('readCache', () => {
  it('returns the stored value while it is live', async () => {
    from.mockReturnValue(
      builder({
        data: { value: { unit: 'lb' }, expires_at: new Date(Date.now() + 60_000).toISOString() },
        error: null,
      }) as never,
    );

    await expect(readCache(cacheKeys.appSettings)).resolves.toEqual({ unit: 'lb' });
  });

  it('treats an expired row as a miss', async () => {
    from.mockReturnValue(
      builder({
        data: { value: { unit: 'lb' }, expires_at: new Date(Date.now() - 1_000).toISOString() },
        error: null,
      }) as never,
    );

    await expect(readCache(cacheKeys.appSettings)).resolves.toBeNull();
  });

  it('keeps a null expiry forever', async () => {
    from.mockReturnValue(
      builder({ data: { value: { unit: 'kg' }, expires_at: null }, error: null }) as never,
    );

    await expect(readCache(cacheKeys.appSettings)).resolves.toEqual({ unit: 'kg' });
  });

  it('reports a failed read as a miss rather than throwing', async () => {
    // A cache is not allowed to break the screen that reads it.
    from.mockReturnValue(
      builder({ data: null, error: { message: 'network down' } }) as never,
    );

    await expect(readCache(cacheKeys.appSettings)).resolves.toBeNull();
  });

  it('is a miss when nobody is signed in', async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null } as never);

    await expect(readCache(cacheKeys.appSettings)).resolves.toBeNull();
    expect(from).not.toHaveBeenCalled();
  });
});

describe('writeCache', () => {
  it('turns a TTL into an absolute expiry and upserts on the composite key', async () => {
    const chain = builder({ data: null, error: null });
    from.mockReturnValue(chain as never);

    const before = Date.now();
    await writeCache(cacheKeys.appSettings, { unit: 'kg' }, { ttlSeconds: 60 });

    const upsert = chain.upsert as jest.Mock;
    const [row, options] = upsert.mock.calls[0] as [Record<string, unknown>, unknown];
    expect(row.user_id).toBe('user-1');
    expect(row.key).toBe(cacheKeys.appSettings);
    expect(new Date(row.expires_at as string).getTime()).toBeGreaterThanOrEqual(before + 60_000);
    expect(options).toEqual({ onConflict: 'user_id,key' });
  });

  it('writes no expiry when no TTL is given', async () => {
    const chain = builder({ data: null, error: null });
    from.mockReturnValue(chain as never);

    await writeCache(cacheKeys.appSettings, { unit: 'kg' });

    const upsert = chain.upsert as jest.Mock;
    const [row] = upsert.mock.calls[0] as [Record<string, unknown>];
    expect(row.expires_at).toBeNull();
  });
});
