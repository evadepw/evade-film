import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * The design system's type scale lives in `@theme` as `--text-title-3`,
 * `--text-body`, … — names tailwind-merge cannot know about. Left unconfigured
 * it files `text-title-3` under *text-color* and then happily drops the
 * `text-primary-foreground` that came before it, which is how the chrome CTA
 * ended up with white text on a white gradient. Declaring the scale here keeps
 * size and colour in separate conflict groups.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display-1",
            "display-2",
            "display-3",
            "title-1",
            "title-2",
            "title-3",
            "body",
            "body-sm",
            "caption",
            "micro",
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
