import "axios";

/**
 * Two private flags the auth interceptor in `lib/api/http.ts` sets on a request
 * config. Declared here so they are typed rather than cast in at the call site.
 */
declare module "axios" {
  interface AxiosRequestConfig {
    /** Login, register and refresh: never carry a bearer token, never renew one. */
    __anonymous?: boolean;
    /** Already replayed once after a token renewal — stops a retry loop forming. */
    __retriedAfterRefresh?: boolean;
  }
}
