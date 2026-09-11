import { LICard, LIText } from '@/components/ui';

interface CheckInEditHeaderProps {
  readonly title: string;
}

export default function CheckInEditHeader({ title }: CheckInEditHeaderProps) {
  return (
    <LICard className="gap-1">
      <LIText size="h4" color="primary" text={title} className="font-geist-semibold" />
      <LIText
        size="caption"
        color="muted"
        text="Weight, measurements and a note. Nothing here is shared unless monthly check-ins are on."
        className="font-geist"
      />
    </LICard>
  );
}
