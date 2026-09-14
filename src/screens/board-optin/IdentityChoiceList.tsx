import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import type { ApiIdentityOption, CommunityIdentity } from '@/api/types';
import { LIInput, LIRadio, LIText } from '@/components/ui';
import { cn } from '@/lib/utils';

interface IdentityChoiceListProps {
  readonly options: readonly ApiIdentityOption[];
  readonly value: CommunityIdentity;
  readonly onChange: (identity: CommunityIdentity) => void;
  readonly handle: string;
  readonly onHandleChange: (handle: string) => void;
}

/**
 * The three ways to appear, each showing the name it would actually produce.
 *
 * The sample is the point of the row. "First name only" is a description that
 * has to be imagined; "Maya A." is the thing itself, and a client can only
 * consent to what they can see. The handle field appears under its own option
 * rather than sitting empty above the others, so the screen never asks for
 * something it does not yet need.
 */
export default function IdentityChoiceList({
  options,
  value,
  onChange,
  handle,
  onHandleChange,
}: IdentityChoiceListProps) {
  return (
    <View className="gap-2">
      <LIText
        size="caption"
        color="muted"
        text="CHOOSE HOW YOU APPEAR"
        className="font-geist-medium tracking-wide"
      />

      <View className="overflow-hidden rounded-card bg-surface px-4">
        {options.map((option, index) => {
          const selected = option.id === value;

          return (
            <View key={option.id}>
              <Pressable
                onPress={() => onChange(option.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${option.label}. ${option.desc} Shown as ${option.sample}.`}
                className={cn(
                  'flex-row items-start gap-3 py-3 active:opacity-70',
                  index > 0 && 'border-t border-border',
                )}
                testID={`identity-${option.id}`}
              >
                <View className="mt-0.5">
                  <LIRadio selected={selected} />
                </View>

                <View className="flex-1 gap-0.5">
                  <LIText
                    size="p"
                    color="primary"
                    text={option.label}
                    className="font-geist-medium"
                  />
                  <LIText size="caption" color="muted" text={option.desc} className="font-geist" />
                </View>

                <LIText
                  size="caption"
                  color={selected ? 'accent' : 'muted'}
                  text={option.sample}
                  numberOfLines={1}
                  className="max-w-[38%] text-right font-geist-medium"
                />
              </Pressable>

              {option.id === 'handle' && selected ? (
                <Animated.View entering={FadeIn} exiting={FadeOut} className="pb-3">
                  <LIInput
                    placeholder="Your handle"
                    value={handle}
                    onChangeText={onHandleChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={20}
                    accessibilityLabel="Your handle"
                    hint="No part of your real name is shown on the board."
                    testID="identity-handle-input"
                  />
                </Animated.View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}
