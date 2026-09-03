import { get, patch, post } from "@/lib/api/http";
import { endpoints } from "@/lib/api/endpoints";
import type { TokenPair } from "@/lib/api/tokens";
import type {
  AuthResponseDto,
  ChangePasswordRequestDto,
  LoginRequestDto,
  ProfileUpdateDto,
  PublicUserDto,
  RegisterRequestDto,
  UserDto,
} from "@/lib/api/types";
import { mapPublicProfile, mapViewer } from "@/lib/domain/mappers";
import type { PublicProfile, Viewer } from "@/lib/domain/models";

/** What `register`, `login` and `change-password` all hand back. */
export interface Session {
  tokens: TokenPair;
  viewer: Viewer;
}

function toSession(dto: AuthResponseDto): Session {
  return {
    tokens: { access: dto.access, refresh: dto.refresh },
    viewer: mapViewer(dto.user),
  };
}

/**
 * Accounts and tokens.
 *
 * The service never touches storage: it returns the token pair and lets
 * `AuthProvider` decide to keep it. That keeps sign-in a pure call — testable,
 * and impossible to trigger from a server render by accident.
 */
export const authService = {
  /** Registration signs you in: the response already carries a token pair. */
  async register(input: RegisterRequestDto): Promise<Session> {
    return toSession(await post<AuthResponseDto>(endpoints.auth.register, input));
  },

  async login(input: LoginRequestDto): Promise<Session> {
    return toSession(await post<AuthResponseDto>(endpoints.auth.login, input));
  },

  /**
   * Blacklists the refresh token. The access token stays valid until it
   * expires, which is why the caller drops it locally regardless of the outcome.
   */
  async logout(refresh: string): Promise<void> {
    await post<void>(endpoints.auth.logout, { refresh });
  },

  async me(): Promise<Viewer> {
    return mapViewer(await get<UserDto>(endpoints.auth.me));
  },

  /** Handle, names, bio, birth date, language. Email and staff flags are read-only. */
  async updateProfile(input: ProfileUpdateDto): Promise<Viewer> {
    return mapViewer(await patch<UserDto>(endpoints.auth.me, input));
  },

  /** Verifying the old password issues a fresh pair — the caller must store it. */
  async changePassword(input: ChangePasswordRequestDto): Promise<Session> {
    return toSession(await post<AuthResponseDto>(endpoints.auth.changePassword, input));
  },

  async publicProfile(username: string): Promise<PublicProfile> {
    return mapPublicProfile(await get<PublicUserDto>(endpoints.auth.publicProfile(username)));
  },
};
