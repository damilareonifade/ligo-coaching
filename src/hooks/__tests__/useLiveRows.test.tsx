import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';

import { useLiveRows } from '@/hooks/useLiveRows';

const mockOn = jest.fn().mockReturnThis();
const mockSubscribe = jest.fn().mockReturnThis();
const mockChannel = jest.fn(() => ({ on: mockOn, subscribe: mockSubscribe }));
const mockRemoveChannel = jest.fn();

jest.mock('@/api/supabase', () => ({
  supabase: {
    channel: (...args: unknown[]) => mockChannel(...(args as [])),
    removeChannel: (...args: unknown[]) => mockRemoveChannel(...(args as [])),
  },
}));

// The hook is a no-op under mocks, which is how every screen can call it
// unconditionally. These tests are about the live path.
jest.mock('@/lib/env', () => ({ env: { useMocks: false } }));

// Built once, outside render. A client created inside would be a new one on
// every render, and the provider swapping identity remounts everything under
// it — which would make the re-render test below pass or fail for a reason
// that has nothing to do with the hook.
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function Harness({ children }: { readonly children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function Subject({ enabled = true, keys = [['a']] }: { enabled?: boolean; keys?: string[][] }) {
  useLiveRows({ key: 't1', filter: 'thread_id=eq.t1', enabled, invalidate: keys });
  return null;
}

/** The bell's use of it: a whole table, unfiltered, scoped by RLS alone. */
function BellSubject() {
  useLiveRows({ key: 'notifications', table: 'notifications', invalidate: [['notifications']] });
  return null;
}

beforeEach(() => jest.clearAllMocks());

describe('useLiveRows', () => {
  it('opens one channel for the thread it was given', async () => {
    await render(
      <Harness>
        <Subject />
      </Harness>,
    );

    expect(mockChannel).toHaveBeenCalledWith('messages:t1');
    expect(mockOn.mock.calls[0][1]).toMatchObject({
      event: 'INSERT',
      table: 'messages',
      filter: 'thread_id=eq.t1',
    });
    expect(mockSubscribe).toHaveBeenCalledTimes(1);
  });

  it('listens to the table it was given, not always to messages', async () => {
    // It was hardcoded to `messages`, which is why the bell had no way to hear
    // about a notification: nothing subscribed on its behalf, so the dot was
    // whatever the count said when Today mounted.
    await render(
      <Harness>
        <BellSubject />
      </Harness>,
    );

    expect(mockOn.mock.calls[0][1]).toMatchObject({
      event: 'INSERT',
      table: 'notifications',
    });
    // No filter at all: `notifications_select_own` already delivers only the
    // reader's own, and a filter here would be that rule restated.
    expect(mockOn.mock.calls[0][1]).not.toHaveProperty('filter');
  });

  it('puts the table in the channel name, so two tables are two channels', async () => {
    // Same key, different tables. Sharing a name would make them one channel
    // and the second subscriber would silently take over the first.
    await render(
      <Harness>
        <BellSubject />
      </Harness>,
    );

    expect(mockChannel).toHaveBeenCalledWith('notifications:notifications');
  });

  it('listens to nothing until there is something to listen about', async () => {
    await render(
      <Harness>
        <Subject enabled={false} />
      </Harness>,
    );

    expect(mockChannel).not.toHaveBeenCalled();
  });

  it('does not rebuild the channel when the caller re-renders', async () => {
    // Every screen builds `invalidate` inline, so it is a fresh array each
    // render. Keyed on identity, the effect would tear the subscription down
    // and rebuild it on every keystroke in the composer.
    const view = await render(
      <Harness>
        <Subject />
      </Harness>,
    );
    await view.rerender(
      <Harness>
        <Subject />
      </Harness>,
    );

    expect(mockChannel).toHaveBeenCalledTimes(1);
    expect(mockRemoveChannel).not.toHaveBeenCalled();
  });

  it('builds a fresh channel when the app comes back', async () => {
    // The socket does not survive backgrounding, and a dead channel is silent
    // rather than noisy — without this the screen quietly stops updating for
    // the rest of the session.
    await render(
      <Harness>
        <Subject />
      </Harness>,
    );
    expect(mockChannel).toHaveBeenCalledTimes(1);

    const handler = (AppState.addEventListener as jest.Mock).mock.calls.at(-1)?.[1];
    await act(async () => handler?.('active'));

    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
    expect(mockChannel).toHaveBeenCalledTimes(2);
  });

  it('lets go of the channel when the screen does', async () => {
    const view = await render(
      <Harness>
        <Subject />
      </Harness>,
    );
    await view.unmount();

    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });
});
