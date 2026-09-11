import { useEffect, useState } from 'react';

/**
 * Milliseconds since `startedAtMs`, re-rendering once a second.
 * Returns 0 when nothing is running, so callers never branch on null.
 */
export function useElapsedMs(startedAtMs: number | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (startedAtMs === null) return;

    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAtMs]);

  return startedAtMs === null ? 0 : Math.max(0, now - startedAtMs);
}
