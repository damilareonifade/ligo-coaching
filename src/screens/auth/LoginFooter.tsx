import { LIText } from '@/components/ui';

/** Pinned to the bottom of the screen: the route out to registration. */
export default function LoginFooter() {
  return (
    <LIText
      size="caption"
      color="body"
      text="Don't have an account?"
      link
      linkValue="Create one"
      linkHref="/register"
      className="text-center"
    />
  );
}
