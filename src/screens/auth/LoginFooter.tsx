import { LIText } from '@/components/ui';
import { useThemeTokens } from '@/theme/tokens';

/** Pinned to the bottom of the screen: the route out to registration. */
export default function LoginFooter() {
  const tokens = useThemeTokens();
  return (
    <LIText
      size="caption"
      color="body"
      text="Don't have an account?"
      link
      linkValue="Create one"
      linkHref="/signup/role"
      linkColor={tokens.violet}
      className="text-center"
    />
  );
}
