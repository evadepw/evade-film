import { notFound } from "next/navigation";

import { ApiError } from "@/lib/api/errors";

/**
 * Unpublished and deleted titles both come back as 404 — the backend hides
 * drafts from anonymous clients. Map that to Next's own not-found boundary and
 * let every other failure bubble to `error.tsx`.
 */
export async function orNotFound<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  }
}
