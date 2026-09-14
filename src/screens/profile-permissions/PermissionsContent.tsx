import { useCallback } from 'react';
import { ScrollView, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { useSetLogForMutation, useSetSharePermissionMutation } from '@/api/clientProfile';
import type { ApiSharePermissionsDetail, ShareDomain } from '@/api/types';
import { LICard, LISwitch, LIText } from '@/components/ui';
import { SHARE_DOMAIN_COPY } from '@/lib/sharing';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/store/uiStore';

interface PermissionsContentProps {
  readonly detail: ApiSharePermissionsDetail;
}

/**
 * What the coach can see, and the one thing they can do.
 *
 * The switches a client met at attach time, shown again where they can be
 * moved — which until now they could not be. Granting was a one-way door:
 * everything agreed to during onboarding stayed agreed to, and the only exit
 * was detaching the coach entirely.
 *
 * The copy is `SHARE_DOMAIN_COPY`, the same sentences used at attach time and
 * on the card when a coach asks. A client who read "Injuries, conditions and
 * medication" when granting must read it again here, or the app has described
 * one permission two ways and they will remember the other one.
 */
export default function PermissionsContent({ detail }: PermissionsContentProps) {
  const showToast = useUiStore((state) => state.showToast);
  const setPermission = useSetSharePermissionMutation();
  const setLogFor = useSetLogForMutation();

  const firstName = detail.coachName?.split(' ')[0] ?? 'Your coach';

  const toggle = useCallback(
    (domain: ShareDomain, shared: boolean) => {
      setPermission.mutate(
        { domain, shared },
        { onError: (error) => showToast(errorMessage(error), 'danger') },
      );
    },
    [setPermission, showToast],
  );

  const toggleLogFor = useCallback(
    (allowed: boolean) => {
      setLogFor.mutate(allowed, {
        onError: (error) => showToast(errorMessage(error), 'danger'),
      });
    },
    [setLogFor, showToast],
  );

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="gap-4 px-4 pb-10 pt-2"
      testID="permissions-scroll"
    >
      <LIText
        size="p"
        color="body"
        text={`${firstName} sees only what is on below. Turn anything off and it is hidden immediately — nothing is deleted, and they are told what changed.`}
        className="font-geist"
      />

      <View className="gap-2">
        <LIText size="caption" color="muted" text="WHAT THEY SEE" className="px-1 font-geist-medium" />
        <LICard className="py-1">
          {SHARE_DOMAIN_COPY.map((copy, index) => (
            <View
              key={copy.key}
              className={cn(
                'flex-row items-center gap-3 py-3',
                index > 0 && 'border-t border-border',
              )}
            >
              <View className="flex-1 gap-0.5">
                <LIText size="p" color="primary" text={copy.title} className="font-geist-medium" />
                <LIText size="caption" color="muted" text={copy.body} className="font-geist" />
              </View>
              <LISwitch
                value={Boolean(detail.permissions[copy.key])}
                onValueChange={(next) => toggle(copy.key, next)}
                accessibilityLabel={copy.title}
                testID={`permission-${copy.key}`}
              />
            </View>
          ))}
        </LICard>
      </View>

      {/* Its own section, not a sixth row above. The five let a coach look;
          this one lets them write, in the client's name, into the history the
          client is measured by. That is a different kind of yes. */}
      <View className="gap-2">
        <LIText size="caption" color="muted" text="WHAT THEY CAN DO" className="px-1 font-geist-medium" />
        <LICard className="py-1">
          <View className="flex-row items-center gap-3 py-3">
            <View className="flex-1 gap-0.5">
              <LIText
                size="p"
                color="primary"
                text="Log sessions for me"
                className="font-geist-medium"
              />
              <LIText
                size="caption"
                color="muted"
                text={`${firstName} can record workouts and check-ins in your name. Every entry says it was them.`}
                className="font-geist"
              />
            </View>
            <LISwitch
              value={detail.logFor}
              onValueChange={toggleLogFor}
              accessibilityLabel="Log sessions for me"
              testID="permission-log-for"
            />
          </View>
        </LICard>
      </View>

      <LIText
        size="caption"
        color="muted"
        text="Detaching your coach turns all of these off at once and ends their access. It is on your Profile."
        className="px-1 font-geist"
      />
    </ScrollView>
  );
}
