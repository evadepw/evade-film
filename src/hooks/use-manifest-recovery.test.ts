import { describe, expect, it } from "vitest";

import { isRecoverable } from "@/hooks/use-manifest-recovery";
import type { PlaybackErrorDetail } from "evade-player";

function failure(overrides: Partial<PlaybackErrorDetail> = {}): PlaybackErrorDetail {
  return { fatal: true, kind: "network", status: 403, time: 1841.2, ...overrides };
}

describe("isRecoverable", () => {
  it.each([401, 403])("retries a fatal %i — the signature lapsed", (status) => {
    expect(isRecoverable(failure({ status }))).toBe(true);
  });

  it("ignores errors the player already recovered from", () => {
    // The reporter fires for non-fatal errors too; acting on them would refetch
    // a manifest on every stalled buffer.
    expect(isRecoverable(failure({ fatal: false }))).toBe(false);
  });

  it.each([
    ["a deleted file", 404],
    ["a broken backend", 500],
    ["a rate limit", 429],
  ])("does not retry %s — a fresh URL fails the same way", (_case, status) => {
    expect(isRecoverable(failure({ status }))).toBe(false);
  });

  it("does not retry a failure with no HTTP status behind it", () => {
    // A decode error or a dropped connection reports no status; re-signing
    // would not address either.
    expect(isRecoverable(failure({ status: undefined, kind: "media" }))).toBe(false);
  });

  it("judges by status, not by category", () => {
    // hls.js files an expired signature under `network`, but a 403 on any
    // channel is still an expiry.
    expect(isRecoverable(failure({ kind: "other", status: 403 }))).toBe(true);
  });
});
