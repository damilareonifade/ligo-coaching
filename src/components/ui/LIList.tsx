import { FlashList, type FlashListProps } from '@shopify/flash-list';

/**
 * Every list in the app. FlashList recycles rows, so a coach with 200 students
 * scrolls at the same cost as one with 10.
 */
export function LIList<TItem>(props: FlashListProps<TItem>) {
  return <FlashList {...props} />;
}
