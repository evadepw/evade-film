import Link from "next/link";

import { Button } from "@/components/ui/button";
import { StateBlock } from "@/components/feedback/state-block";
import { getDictionary } from "@/lib/i18n/dictionary";
import { routes } from "@/lib/routes";

export default function NotFound() {
  // `not-found.tsx` is rendered without params, so it speaks the default
  // language. A translated 404 needs a catch-all route, which is more
  // machinery than the page is worth.
  const t = getDictionary();
  return (
    <StateBlock
      title={t.error.notFoundTitle}
      hint={t.error.notFoundHint}
      action={
        <Button asChild variant="secondary">
          <Link href={routes.home}>{t.action.toCatalog}</Link>
        </Button>
      }
    />
  );
}
