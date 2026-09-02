/** LIText size variants → Tailwind classes. The single place type scale lives. */
export const textSizeClass = {
  h1: 'text-h1 font-bold',
  h2: 'text-h2 font-bold',
  h3: 'text-h3 font-semibold',
  h4: 'text-h4 font-semibold',
  h5: 'text-h5 font-semibold',
  p: 'text-p font-normal',
  caption: 'text-caption font-normal',
} as const;

export type LITextSize = keyof typeof textSizeClass;

export const textColorClass = {
  primary: 'text-navy',
  body: 'text-dark-gray',
  muted: 'text-muted',
  accent: 'text-teal',
  danger: 'text-danger',
  success: 'text-success',
  warning: 'text-warning',
  inverse: 'text-white',
} as const;

export type LITextColor = keyof typeof textColorClass;
