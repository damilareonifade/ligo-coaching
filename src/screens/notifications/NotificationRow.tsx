import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { memo, useCallback } from 'react';
import { Linking, View } from 'react-native';

import type { ApiNotification } from '@/api/types';
import { LIAvatar, LICard, LIText } from '@/components/ui';
import { isAccessChange, isAccessLoss } from '@/lib/notifications';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/store/uiStore';

import NotificationAccessGlyph from './NotificationAccessGlyph';

interface NotificationRowProps {
  readonly item: ApiNotification;
  readonly onRead: (id: string) => void;
  /** Rows are one white card per group, so the ends round and the rest divide. */
  readonly first: boolean;
  readonly last: boolean;
}

/** Memoised: FlashList recycles rows, and marking one read re-renders the feed. */
function NotificationRow({ item, onRead, first, last }: NotificationRowProps) {
  const router = useRouter();
  const showToast = useUiStore((state) => state.showToast);
  const access = isAccessChange(item.kind);

  /**
   * Read and open are one gesture.
   *
   * Marking read comes first and happens whatever the destination does — a row
   * with nowhere to go was still read, and so was one whose link failed to
   * open. The read itself fails silently on purpose: you are already on the
   * screen it opened, and a toast about a read receipt would be louder than
   * the thing it failed to do. A link that will not open is the opposite —
   * that one you need told about, because you are still looking at the row.
   */
  const handlePress = useCallback(() => {
    if (item.unread) onRead(item.id);

    const destination = item.destination;
    if (!destination) return;

    if (destination.kind === 'screen') {
      router.push(destination.route as never);
      return;
    }

    if (destination.kind === 'web') {
      // In-app, so the person stays in Ligo and comes back with a Done button
      // rather than having to find their way back through a browser.
      void WebBrowser.openBrowserAsync(destination.url).catch(() =>
        showToast('That link could not be opened.', 'danger'),
      );
      return;
    }

    // Leaving on purpose: a calendar invite or a booking app belongs to
    // whatever owns it, not to a browser tab inside a training app.
    void Linking.openURL(destination.url).catch(() =>
      showToast('Nothing on this phone can open that link.', 'danger'),
    );
  }, [item, onRead, router, showToast]);

  return (
    <LICard
      onPress={handlePress}
      className={cn(
        'gap-0 rounded-none px-4 py-3',
        first && 'rounded-t-card',
        last && 'rounded-b-card',
        !first && 'border-t border-hairline',
      )}
      testID={`notification-row-${item.id}`}
    >
      <View className="flex-row items-center gap-3">
        {item.person ? (
          <View>
            <LIAvatar name={item.person.name} size="sm" />
            {access ? <NotificationAccessGlyph kind={item.kind} /> : null}
          </View>
        ) : null}

        <View className="flex-1 gap-0.5">
          <View className="flex-row items-center gap-2">
            {/* Unread is a dot rather than a violet title: the title's colour is
                already spoken for on access rows, and two meanings on one word
                is one meaning too many. */}
            {item.unread ? (
              <View className="h-2 w-2 rounded-pill bg-violet" testID="notification-unread-dot" />
            ) : null}
            <LIText
              size="p"
              color="primary"
              text={item.title}
              numberOfLines={1}
              className="shrink font-geist-semibold"
            />
          </View>

          {/* The second half of the access treatment. A grant reads violet, a
              revoke or a detach reads danger, everything else stays muted — so
              the tone alone says which way the boundary moved. */}
          <LIText
            size="caption"
            color={access ? (isAccessLoss(item.kind) ? 'danger' : 'accent') : 'muted'}
            text={item.body}
            numberOfLines={2}
            className="font-geist"
          />
        </View>

        <LIText size="caption" color="muted" text={item.when} className="font-geist-medium" />
      </View>
    </LICard>
  );
}

export default memo(NotificationRow);
