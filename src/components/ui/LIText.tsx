import { Link, type Href } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { cn } from '@/lib/utils';
import { textColorClass, textSizeClass, type LITextColor, type LITextSize } from '@/theme/typography';

export interface LITextProps {
  readonly text: string;
  readonly size?: LITextSize;
  readonly color?: LITextColor;
  readonly className?: string;
  readonly numberOfLines?: number;
  /** Append an inline link after `text`. Requires `linkValue` + `linkHref`. */
  readonly link?: boolean;
  readonly linkValue?: string;
  readonly linkHref?: Href;
  readonly handleClick?: () => void;
  readonly testID?: string;
}

/**
 * The only text primitive in the app. Never import `Text` from react-native
 * outside this folder — the type scale and color tokens live here.
 */
export function LIText({
  text,
  size = 'p',
  color = 'body',
  className,
  numberOfLines,
  link = false,
  linkValue,
  linkHref,
  handleClick,
  testID,
}: LITextProps) {
  const classes = cn(textSizeClass[size], textColorClass[color], className);

  const body = (
    <Text className={classes} numberOfLines={numberOfLines} testID={testID}>
      {text}
      {link && linkValue && linkHref ? (
        <>
          {' '}
          <Link href={linkHref} className="text-teal underline">
            {linkValue}
          </Link>
        </>
      ) : null}
    </Text>
  );

  if (!handleClick) return body;

  return (
    <Pressable onPress={handleClick} accessibilityRole="button" hitSlop={8}>
      {body}
    </Pressable>
  );
}
