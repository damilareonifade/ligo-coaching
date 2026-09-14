import { useRouter, type Href } from 'expo-router';
import { useCallback } from 'react';

import type { ApiSettingsRow } from '@/api/types';
import { useUiStore } from '@/store/uiStore';

/**
 * A row with a `route` navigates; everything else is a stub until its screen
 * exists. Routes arrive from the API as plain strings, so the typed-route cast
 * happens here once rather than at every call site.
 */
export function useRowAction(): (row: ApiSettingsRow) => void {
  const router = useRouter();
  const showToast = useUiStore((state) => state.showToast);

  return useCallback(
    (row: ApiSettingsRow) => {
      if (row.route) {
        router.push(row.route as Href);
        return;
      }
      showToast('Not connected yet', 'success');
    },
    [router, showToast],
  );
}
