import axios from "axios";

/**
 * A single error shape for the whole app, so pages and hooks never have to
 * know they are talking to axios.
 */
export class ApiError extends Error {
  readonly status: number | null;
  readonly url: string | undefined;
  readonly cause: unknown;
  /**
   * DRF's per-field validation messages, flattened to one string per field.
   * Forms render these next to their inputs; `message` stays the summary.
   */
  readonly fieldErrors: Record<string, string>;

  constructor(
    message: string,
    options: {
      status?: number | null;
      url?: string;
      cause?: unknown;
      fieldErrors?: Record<string, string>;
    },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = options.status ?? null;
    this.url = options.url;
    this.cause = options.cause;
    this.fieldErrors = options.fieldErrors ?? {};
  }

  /** 404 — the title is missing or still a draft. Pages map this to `notFound()`. */
  get isNotFound(): boolean {
    return this.status === 404;
  }

  /** No response at all: the API is unreachable or the request timed out. */
  get isNetworkError(): boolean {
    return this.status === null;
  }

  /** 401 — no token, or one the API no longer accepts. */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** 403 — signed in, but not allowed: a comment ban, someone else's comment. */
  get isForbidden(): boolean {
    return this.status === 403;
  }
}

/**
 * DRF answers a validation failure with `{field: ["message", ...]}`, sometimes
 * alongside `detail` or a bare `non_field_errors`. Everything that is not a
 * recognised envelope key is treated as a field.
 */
type DrfErrorBody = Record<string, unknown> & {
  error?: string;
  detail?: string;
};

/**
 * Keys that describe the failure rather than a field. `code` and `messages`
 * come from SimpleJWT, which answers an expired access token with
 * `{detail, code: "token_not_valid", messages: [...]}` — without them here a
 * form would render «token_not_valid» underneath one of its inputs.
 */
const ENVELOPE_KEYS = new Set(["error", "detail", "code", "messages"]);

function flattenFieldErrors(body: DrfErrorBody | undefined): Record<string, string> {
  if (!body || typeof body !== "object" || Array.isArray(body)) return {};

  const result: Record<string, string> = {};
  for (const [field, value] of Object.entries(body)) {
    if (ENVELOPE_KEYS.has(field)) continue;
    const message = Array.isArray(value)
      ? value.filter((entry) => typeof entry === "string").join(" ")
      : typeof value === "string"
        ? value
        : null;
    if (message) result[field] = message;
  }
  return result;
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (axios.isAxiosError<DrfErrorBody>(error)) {
    const status = error.response?.status ?? null;
    const body = error.response?.data;
    const fieldErrors = flattenFieldErrors(body);
    const message =
      body?.error ??
      body?.detail ??
      Object.values(fieldErrors)[0] ??
      (status === null ? "Сервис недоступен. Проверьте соединение." : error.message);

    return new ApiError(message, {
      status,
      url: error.config?.url,
      cause: error,
      fieldErrors,
    });
  }

  return new ApiError(error instanceof Error ? error.message : "Неизвестная ошибка", {
    cause: error,
  });
}
