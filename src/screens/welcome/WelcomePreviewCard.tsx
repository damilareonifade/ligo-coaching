import { View } from 'react-native';

import { LIText } from '@/components/ui';
import { cn } from '@/lib/utils';

import type { WelcomeMock } from './slides';

export interface WelcomePreviewCardProps {
  readonly mock: WelcomeMock;
  readonly width: number;
}

/**
 * The slide's miniature of the app itself.
 *
 * A picture of a screen rather than a screenshot: it is authored from the
 * same tokens as the real thing, so it follows the theme, never goes stale
 * against a redesign, and costs one `View` tree instead of four PNGs at three
 * densities.
 *
 * The design draws it as a phone, with a four-pixel near-black bezel. That
 * only works on a field that is dark in every theme; on one that follows the
 * palette the bezel is either invisible in light mode or a black slab in it,
 * so the miniature is a card here — the same hairline border and surface
 * every other card on the screen behind it would have.
 */
export function WelcomePreviewCard({ mock, width }: WelcomePreviewCardProps) {
  const peak = Math.max(...mock.bars);

  return (
    <View
      style={{ width }}
      className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm"
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Preview of ${mock.title} in SetTrack`}
      testID="welcome-preview-card"
    >
      <View className="flex-row items-center gap-2 border-b border-border px-3 py-2">
        <LIText
          size="caption"
          color="primary"
          text={mock.title}
          numberOfLines={1}
          className="flex-1 font-geist-semibold"
        />
        <View className="rounded-pill bg-surface-sunken px-2 py-0.5">
          <LIText
            size="caption"
            color="muted"
            text={mock.chip}
            numberOfLines={1}
            className="font-geist-medium"
          />
        </View>
      </View>

      <View className="gap-1.5 px-3 py-2.5" testID="welcome-preview-rows">
        {mock.rows.map((row, index) => (
          // Keyed by position, not by label. A label is not an identity here:
          // the live-session slide is three sets of the same lift, which is
          // what a live session looks like, and keying by name made React
          // drop two of them. Like the bars below, these rows are a
          // fixed-length list whose order is the whole of what they are.
          <View key={index} className="flex-row items-center gap-2">
            <View
              className={cn(
                'h-1.5 w-1.5 rounded-pill',
                row.state === 'done' ? 'bg-violet' : 'bg-border-strong',
              )}
            />
            <LIText
              size="caption"
              color="body"
              text={row.label}
              numberOfLines={1}
              className="flex-1 font-geist"
            />
            <LIText
              size="caption"
              color="primary"
              text={row.value}
              numberOfLines={1}
              className="font-geist-medium"
            />
          </View>
        ))}

        {/* Bars, not a chart: nothing here is read as a number, and a Skia
            canvas for a decoration on the sign-in screen would pull the whole
            charting stack into the first bundle anyone loads. */}
        <View className="mt-1 h-12 flex-row items-end gap-1 rounded-xl bg-surface-sunken p-2">
          {mock.bars.map((bar, index) => (
            <View
              key={index}
              style={{ height: `${Math.round(bar * 100)}%` }}
              className={cn(
                'flex-1 rounded-sm',
                bar === peak ? 'bg-violet' : 'bg-border-strong',
              )}
            />
          ))}
        </View>
      </View>

      <View className="flex-row gap-1.5 border-t border-border px-3 py-2">
        {mock.tabs.map((tab, index) => (
          <View
            key={index}
            className={cn(
              'rounded-pill px-2 py-0.5',
              index === 0 ? 'bg-violet-weak' : 'bg-transparent',
            )}
          >
            <LIText
              size="caption"
              color={index === 0 ? 'accent' : 'muted'}
              text={tab}
              numberOfLines={1}
              className="font-geist-medium"
            />
          </View>
        ))}
      </View>
    </View>
  );
}
