import { Link, type Href } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { cn } from '@/lib/utils';
import { textColorClass, textSizeClass, type LITextColor, type LITextSize } from '@/theme/typography';
import { useThemeTokens } from '@/theme/tokens';

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
  /**
   * Raw color for the inline link (default `tokens.violet`). `Link`'s `className`
   * only applies on web — expo-router's own `useInteropClassName` returns
   * `props.style` unchanged whenever `Platform.OS !== 'web'` — so the link is
   * styled via `style`, not `className`, to actually render on iOS/Android.
   */
  readonly linkColor?: string;
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
  linkColor,
  handleClick,
  testID,
}: LITextProps) {
  const tokens = useThemeTokens();
  const classes = cn(textSizeClass[size], textColorClass[color], className);

  const body = (
    <Text className={classes} numberOfLines={numberOfLines} testID={testID}>
      {text}
      {link && linkValue && linkHref ? (
        <>
          {' '}
          <Link
            href={linkHref}
            style={{ color: linkColor ?? tokens.violet, textDecorationLine: 'underline' }}
          >
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
