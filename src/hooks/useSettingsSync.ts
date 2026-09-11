import { useEffect, useRef } from 'react';

import { cacheKeys, readCache, writeCache } from '@/api/serverCache';
import type { WeightUnit } from '@/lib/format';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';

interface SyncedSettings {
  readonly unit: WeightUnit;
  readonly sessionReminders: boolean;
}

function parse(value: unknown): SyncedSettings | null {
  if (typeof value !== 'object' || value === null) return null;
  const { unit, sessionReminders } = value as Record<string, unknown>;
  if (unit !== 'kg' && unit !== 'lb') return null;
  if (typeof sessionReminders !== 'boolean') return null;
  return { unit, sessionReminders };
}

/**
 * Carries the app's own preferences between a person's devices.
 *
 * MMKV already persists these locally; this puts them in `public.cache` so a
 * coach who signs in on a second phone, or reinstalls, does not find their
 * units back on kilograms. The cache is not the source of truth — a miss just
 * means the local value stands, which is why every failure here is silent.
 *
 * Pull once per sign-in, then write through on change.
 */
export function useSettingsSync(): void {
  const status = useAuthStore((state) => state.status);
  const unit = useSettingsStore((state) => state.unit);
  const sessionReminders = useSettingsStore((state) => state.sessionReminders);
  const setUnit = useSettingsStore((state) => state.setUnit);
  const setSessionReminders = useSettingsStore((state) => state.setSessionReminders);

  // Writes are skipped until the pull has landed, so the remote value is not
  // immediately overwritten by whatever this device happened to hold.
  const pulled = useRef(false);

  useEffect(() => {
    if (status !== 'signed-in') {
      pulled.current = false;
      return;
    }

    let cancelled = false;
    void readCache<unknown>(cacheKeys.appSettings).then((value) => {
      if (cancelled) return;
      const remote = parse(value);
      if (remote) {
        setUnit(remote.unit);
        setSessionReminders(remote.sessionReminders);
      }
      pulled.current = true;
    });

    return () => {
      cancelled = true;
    };
  }, [setSessionReminders, setUnit, status]);

  useEffect(() => {
    if (status !== 'signed-in' || !pulled.current) return;
    // Thirty days: long enough to be useful, short enough that an abandoned
    // account's row is reclaimed by the sweeper rather than kept forever.
    void writeCache(cacheKeys.appSettings, { unit, sessionReminders }, { ttlSeconds: 2_592_000 });
  }, [sessionReminders, status, unit]);
}
