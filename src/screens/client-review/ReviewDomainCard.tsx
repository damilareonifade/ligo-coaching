import { View } from 'react-native';

import type { ApiReviewDomain } from '@/api/types';
import { LIBadge, LIButton, LICard, LIText } from '@/components/ui';
import { domainBadge, isGranted, requestAction, visibleRows } from '@/lib/clientReview';
import { cn } from '@/lib/utils';

interface ReviewDomainCardProps {
  readonly domain: ApiReviewDomain;
  readonly onRequest: (domainId: ApiReviewDomain['id']) => void;
  readonly requesting: boolean;
}

/**
 * One domain of a client's life, and whether the coach may look at it.
 *
 * The rows come from `visibleRows`, never from `domain.rows` directly. That
 * indirection is the whole safety property of this screen: an ungranted domain
 * renders no rows because there are none to render, not because a conditional
 * above them happened to be written correctly. If a server ever sends values
 * alongside `not-granted`, they die in that function rather than on a coach's
 * phone.
 *
 * There is deliberately no placeholder — no dash, no greyed number, no "—".
 * A blurred value tells a coach that something is there and that they are one
 * step from it, which is both untrue and an invitation to lean on the client
 * for it. An empty card and a sentence explaining why is the honest shape.
 *
 * An ungranted card is set apart by a dashed border rather than a fill. A
 * filled, greyed card reads as a disabled control — something switched off
 * that could be switched on from here. A dashed outline reads as an absence,
 * which is what this is: the client has not put anything in it, and only they
 * can.
 */
export default function ReviewDomainCard({
  domain,
  onRequest,
  requesting,
}: ReviewDomainCardProps) {
  const granted = isGranted(domain.access);
  const badge = domainBadge(domain.access);
  const rows = visibleRows(domain);
  const action = requestAction(domain.access);

  return (
    <LICard
      className={cn('gap-3', !granted && 'border border-dashed border-hairline-strong')}
      testID={`review-domain-${domain.id}`}
    >
      <View className="flex-row items-center justify-between gap-3">
        <LIText
          size="h5"
          color={granted ? 'primary' : 'muted'}
          text={domain.title}
          className="flex-1 font-geist-semibold"
          numberOfLines={1}
        />
        <LIBadge tone={badge.tone} label={badge.label} labelClassName="font-geist-medium" />
      </View>

      {rows.length > 0 ? (
        <View className="gap-2">
          {rows.map((row) => (
            <View key={row.label} className="flex-row items-center justify-between gap-3">
              <LIText size="p" color="muted" text={row.label} className="font-geist" />
              <LIText
                size="p"
                color="primary"
                text={row.value}
                className="text-right font-geist-medium"
                numberOfLines={1}
              />
            </View>
          ))}
        </View>
      ) : null}

      <LIText
        size="caption"
        color="muted"
        text={domain.note}
        className="font-geist"
        testID={`review-note-${domain.id}`}
      />

      {action ? (
        <LIButton
          title={action.title}
          variant="outline"
          size="sm"
          fullWidth
          shape="rounded"
          disabled={action.disabled}
          loading={requesting}
          onPress={() => onRequest(domain.id)}
          testID={`review-request-${domain.id}`}
        />
      ) : null}
    </LICard>
  );
}
