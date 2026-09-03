import Link from "next/link";

import { Button } from "@/components/ui/button";
import { StateBlock } from "@/components/feedback/state-block";
import { dictionary } from "@/lib/i18n/dictionary";
import { routes } from "@/lib/routes";

export default function NotFound() {
  return (
    <StateBlock
      title={dictionary.error.notFoundTitle}
      hint={dictionary.error.notFoundHint}
      action={
        <Button asChild variant="secondary">
          <Link href={routes.home}>{dictionary.action.toCatalog}</Link>
        </Button>
      }
    />
  );
}
