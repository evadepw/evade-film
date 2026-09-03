"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { StateBlock } from "@/components/feedback/state-block";
import { ApiError } from "@/lib/api/errors";
import { dictionary } from "@/lib/i18n/dictionary";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // An unreachable API is a different message from a broken page: name the fact
  // the viewer can act on.
  const offline = error instanceof ApiError && error.isNetworkError;

  return (
    <StateBlock
      title={offline ? dictionary.error.offline : dictionary.error.title}
      hint={offline ? dictionary.error.offlineHint : dictionary.error.hint}
      action={
        <Button variant="secondary" onClick={reset}>
          {dictionary.action.retry}
        </Button>
      }
    />
  );
}
