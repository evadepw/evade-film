"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { StateBlock } from "@/components/feedback/state-block";
import { ApiError } from "@/lib/api/errors";
import { useDictionary } from "@/lib/i18n/dictionary-context";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useDictionary();

  useEffect(() => {
    console.error(error);
  }, [error]);

  // An unreachable API is a different message from a broken page: name the fact
  // the viewer can act on.
  const offline = error instanceof ApiError && error.isNetworkError;

  return (
    <StateBlock
      title={offline ? t.error.offline : t.error.title}
      hint={offline ? t.error.offlineHint : t.error.hint}
      action={
        <Button variant="secondary" onClick={reset}>
          {t.action.retry}
        </Button>
      }
    />
  );
}
