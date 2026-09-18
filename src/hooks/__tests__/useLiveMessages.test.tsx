import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';

import { useLiveMessages } from '@/hooks/useLiveMessages';

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
  useLiveMessages({ key: 't1', filter: 'thread_id=eq.t1', enabled, invalidate: keys });
  return null;
}

beforeEach(() => jest.clearAllMocks());

describe('useLiveMessages', () => {
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
