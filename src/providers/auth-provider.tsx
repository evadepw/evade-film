"use client";

import {
  createContext,
  use,
  useCallback,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { authService } from "@/lib/api/services/auth.service";
import { queryKeys } from "@/lib/api/query-keys";
import { readTokens, subscribeToTokens, writeTokens } from "@/lib/api/tokens";
import { ApiError } from "@/lib/api/errors";
import type {
  ChangePasswordRequestDto,
  LoginRequestDto,
  ProfileUpdateDto,
  RegisterRequestDto,
} from "@/lib/api/types";
import type { Viewer } from "@/lib/domain/models";

export interface AuthContextValue {
  viewer: Viewer | null;
  /** True until the stored token has been checked against `/auth/me/`. */
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (input: LoginRequestDto) => Promise<Viewer>;
  register: (input: RegisterRequestDto) => Promise<Viewer>;
  logout: () => Promise<void>;
  updateProfile: (input: ProfileUpdateDto) => Promise<Viewer>;
  changePassword: (input: ChangePasswordRequestDto) => Promise<Viewer>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const NO_TOKENS = () => null;
const NEVER_CHANGES = () => () => {};
const ON_CLIENT = () => true;
const ON_SERVER = () => false;

/**
 * The session, client-side.
 *
 * The token lives in `lib/api/tokens` and never reaches a server render — see
 * the note there for why. So this provider is the whole of the app's knowledge
 * of who is watching: server components render the catalogue anonymously and
 * anything personal hydrates here.
 *
 * `/auth/me/` is the source of truth rather than the token payload: a stored
 * token can be stale, blacklisted, or belong to an account that has since been
 * comment-banned, and the UI has to reflect that on the first paint after load.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  /**
   * The token store is external state, so it is read through
   * `useSyncExternalStore` rather than copied into a `useEffect`. The server
   * snapshot is always `null` — there is no token during a server render — and
   * React swaps in the real one right after hydration, which is also how a
   * sign-out in another tab reaches this one.
   */
  const hasToken = Boolean(useSyncExternalStore(subscribeToTokens, readTokens, NO_TOKENS));

  /**
   * Distinguishes «no session» from «not looked yet». Without it the header
   * would offer «войти» to a signed-in viewer for the frame between hydration
   * and the first snapshot.
   */
  const hydrated = useSyncExternalStore(NEVER_CHANGES, ON_CLIENT, ON_SERVER);

  const { data: viewer, isLoading } = useQuery({
    queryKey: queryKeys.viewer,
    queryFn: () => authService.me(),
    enabled: hydrated && hasToken,
    staleTime: 5 * 60_000,
    retry: (failureCount, error) => {
      // A 401 here means the refresh already failed; retrying cannot help.
      if (error instanceof ApiError && error.isUnauthorized) return false;
      return failureCount < 1;
    },
  });

  /**
   * Everything personal — ratings, watchlist rows, comment reactions, history —
   * is keyed without a viewer id, so the cache is emptied on every identity
   * change rather than being selectively invalidated. Anything left behind
   * would show the previous account's data to the next one.
   */
  const resetCaches = useCallback(() => {
    queryClient.removeQueries({ queryKey: queryKeys.viewer });
    queryClient.removeQueries({ queryKey: queryKeys.me.all });
    queryClient.removeQueries({ queryKey: queryKeys.interactions.all });
  }, [queryClient]);

  const adopt = useCallback(
    (session: { tokens: { access: string; refresh: string }; viewer: Viewer }) => {
      resetCaches();
      writeTokens(session.tokens);
      queryClient.setQueryData(queryKeys.viewer, session.viewer);
      return session.viewer;
    },
    [queryClient, resetCaches],
  );

  const login = useCallback(
    async (input: LoginRequestDto) => adopt(await authService.login(input)),
    [adopt],
  );

  const register = useCallback(
    async (input: RegisterRequestDto) => adopt(await authService.register(input)),
    [adopt],
  );

  const changePassword = useCallback(
    async (input: ChangePasswordRequestDto) => adopt(await authService.changePassword(input)),
    [adopt],
  );

  const logout = useCallback(async () => {
    const tokens = readTokens();

    // The local session ends whether or not the blacklist call lands: a network
    // failure must not leave someone signed in on a shared machine.
    try {
      if (tokens) await authService.logout(tokens.refresh);
    } catch {
      // Already expired or blacklisted — nothing to undo.
    } finally {
      writeTokens(null);
      resetCaches();
    }
  }, [resetCaches]);

  const updateProfile = useCallback(
    async (input: ProfileUpdateDto) => {
      const updated = await authService.updateProfile(input);
      queryClient.setQueryData(queryKeys.viewer, updated);
      return updated;
    },
    [queryClient],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      viewer: viewer ?? null,
      isLoading: !hydrated || (hasToken && isLoading),
      isAuthenticated: Boolean(viewer),
      login,
      register,
      logout,
      updateProfile,
      changePassword,
    }),
    [viewer, hydrated, hasToken, isLoading, login, register, logout, updateProfile, changePassword],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const context = use(AuthContext);
  if (!context) throw new Error("useAuth() требует <AuthProvider> выше по дереву.");
  return context;
}
