import axios, {
  type AxiosAdapter,
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";

import { apiConfig } from "./config";
import { endpoints } from "./endpoints";
import { toApiError } from "./errors";
import { readTokens, writeTokens } from "./tokens";
import type { TokenRefreshDto } from "./types";

/**
 * The one axios instance the app uses. It runs on both the server (RSC data
 * fetching) and the client (React Query), which is why the origin is resolved
 * lazily per environment.
 *
 * Interceptors do three things and nothing more:
 *  - drop `undefined` / empty query params so URLs stay clean and cache keys stable;
 *  - attach the bearer token, and renew it once when the API says it expired;
 *  - normalise every failure into `ApiError`.
 */
/**
 * In mock mode the fixtures replace the network at the adapter level, so
 * everything above this line — services, mappers, hooks, server components —
 * runs unchanged. The import is dynamic so the fixtures land in their own chunk
 * and are never fetched when mocking is off.
 */
const mockAdapter: AxiosAdapter = async (config) => {
  const { mockAdapter: handle } = await import("./mock/adapter");
  return handle(config);
};

const ANONYMOUS_PATHS: readonly string[] = [
  endpoints.auth.login,
  endpoints.auth.register,
  endpoints.auth.refresh,
];

function createHttpClient(): AxiosInstance {
  const instance = axios.create({
    baseURL: apiConfig.baseUrl,
    timeout: apiConfig.timeout,
    headers: { Accept: "application/json" },
    ...(apiConfig.useMocks ? { adapter: mockAdapter } : null),
  });

  instance.interceptors.request.use((config) => {
    if (config.params && typeof config.params === "object") {
      config.params = Object.fromEntries(
        Object.entries(config.params as Record<string, unknown>).filter(
          ([, value]) => value !== undefined && value !== null && value !== "",
        ),
      );
    }

    config.__anonymous ||= ANONYMOUS_PATHS.includes(config.url ?? "");

    // `readTokens()` answers null on the server, so an RSC render is always
    // anonymous — this instance is a singleton shared by every request.
    const tokens = config.__anonymous ? null : readTokens();
    if (tokens) config.headers.set("Authorization", `Bearer ${tokens.access}`);

    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
      const config = axios.isAxiosError(error)
        ? (error.config as InternalAxiosRequestConfig | undefined)
        : undefined;

      if (
        config &&
        !config.__anonymous &&
        !config.__retriedAfterRefresh &&
        (error as AxiosError).response?.status === 401 &&
        readTokens()
      ) {
        const renewed = await refreshAccessToken(instance);
        if (renewed) {
          config.__retriedAfterRefresh = true;
          return instance.request(config);
        }
      }

      return Promise.reject(toApiError(error));
    },
  );

  return instance;
}

/**
 * Access tokens are short-lived, so a 401 on a valid session is routine rather
 * than an error — one renewal, then the original request is replayed.
 *
 * Single-flight on purpose: a page that fires five queries at once would
 * otherwise burn five refresh tokens, and with rotation enabled four of them
 * come back invalid.
 */
let pendingRefresh: Promise<boolean> | null = null;

function refreshAccessToken(instance: AxiosInstance): Promise<boolean> {
  pendingRefresh ??= (async () => {
    const tokens = readTokens();
    if (!tokens) return false;

    try {
      const { data } = await instance.post<TokenRefreshDto>(
        endpoints.auth.refresh,
        { refresh: tokens.refresh },
        { __anonymous: true },
      );
      writeTokens({ access: data.access, refresh: data.refresh || tokens.refresh });
      return true;
    } catch {
      // The refresh token is expired or blacklisted: the session is over.
      // `writeTokens(null)` is what tells the auth provider to drop the user.
      writeTokens(null);
      return false;
    } finally {
      pendingRefresh = null;
    }
  })();

  return pendingRefresh;
}

let client: AxiosInstance | undefined;

export function http(): AxiosInstance {
  client ??= createHttpClient();
  return client;
}

/* Thin typed helpers — services stay one-liners and never import axios directly. */

export async function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await http().get<T>(url, config);
  return response.data;
}

export async function post<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await http().post<T>(url, body, config);
  return response.data;
}

export async function put<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await http().put<T>(url, body, config);
  return response.data;
}

export async function patch<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await http().patch<T>(url, body, config);
  return response.data;
}

export async function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await http().delete<T>(url, config);
  return response.data;
}
