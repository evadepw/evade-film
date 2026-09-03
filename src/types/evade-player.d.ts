import type { Ref } from "react";

/**
 * `<evade-player>` is a custom element, so React needs to be told it exists.
 * Only the ref is typed here — every other value is assigned as a property from
 * `components/player/video-player.impl.tsx`, which is where the typing lives.
 */
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "evade-player": {
        ref?: Ref<HTMLElement>;
        class?: string;
        id?: string;
      };
    }
  }
}

export {};
