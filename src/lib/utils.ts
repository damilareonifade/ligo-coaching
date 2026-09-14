import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * Our type scale uses custom `text-*` keys (`text-h1`…`text-caption`, see
 * tailwind.config.js). tailwind-merge only knows the stock size scale, so it
 * classifies these as text *colors* and silently drops the real color whenever
 * the two collide — e.g. `cn('text-inverse', 'text-h5')` returned just `text-h5`,
 * which is why every LIButton label rendered black. Registering them as
 * font-size keeps colors and sizes in separate groups.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['h1', 'h2', 'h3', 'h4', 'h5', 'p', 'caption'] }],
    },
  },
});

/** Merge Tailwind class strings, last-wins on conflicts. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
