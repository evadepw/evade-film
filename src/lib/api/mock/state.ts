import type {
  CommentDto,
  CommentThreadDto,
  ContentRefDto,
  MyCommentDto,
  ProfileUpdateDto,
  PublicUserDto,
  RatingSummaryDto,
  UserDto,
  WatchHistoryDto,
  WatchlistItemDto,
  WatchlistStatus,
} from "@/lib/api/types";

import { mockMovies, mockSeries } from "./fixtures";

/**
 * In-memory state for the interactive half of the mock API.
 *
 * The catalogue fixtures are static because the real catalogue is authored
 * elsewhere; everything here is not, because ratings, comments, shelves and
 * resume points are exactly what the frontend *writes*. A mock that only reads
 * would leave the half of the app that mutates untested.
 *
 * It is mirrored into `sessionStorage` so a full page load does not sign the
 * developer out and drop everything they just wrote. Nothing here is meant to
 * look like a database: closing the tab is still a reset, and the server side
 * of a render never sees any of it (there is no storage there, and every
 * authenticated call is made from the browser anyway).
 */

const STORAGE_KEY = "evade.mock-state";

/** Serialised form of everything below — `Map`s and `Set`s flattened to arrays. */
interface Snapshot {
  nextUserId: number;
  accounts: Array<[string, MockAccount]>;
  sessions: Array<[string, string]>;
  ratings: Array<[string, Array<[number, number]>]>;
  views: Array<[string, number]>;
  countedToday: string[];
  nextCommentId: number;
  comments: Array<Omit<MockComment, "reactions"> & { reactions: Array<[number, 1 | -1]> }>;
  nextWatchlistId: number;
  watchlist: MockWatchlistEntry[];
  nextHistoryId: number;
  history: MockHistoryEntry[];
}

function snapshot(): Snapshot {
  return {
    nextUserId,
    accounts: [...accounts],
    sessions: [...sessions],
    ratings: [...ratings].map(([key, byUser]) => [key, [...byUser]]),
    views: [...views],
    countedToday: [...countedToday],
    nextCommentId,
    comments: comments.map((comment) => ({ ...comment, reactions: [...comment.reactions] })),
    nextWatchlistId,
    watchlist,
    nextHistoryId,
    history,
  };
}

/** Called after every mutation. Cheap enough at fixture scale to skip batching. */
function persist(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot()));
  } catch {
    // Storage disabled: the mock simply goes back to living for one page.
  }
}

function restore(): void {
  if (typeof window === "undefined") return;

  let saved: Snapshot | null = null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    saved = raw ? (JSON.parse(raw) as Snapshot) : null;
  } catch {
    saved = null;
  }
  if (!saved) return;

  nextUserId = saved.nextUserId;
  nextCommentId = saved.nextCommentId;
  nextWatchlistId = saved.nextWatchlistId;
  nextHistoryId = saved.nextHistoryId;

  for (const [email, account] of saved.accounts) accounts.set(email, account);
  for (const [token, email] of saved.sessions) sessions.set(token, email);
  for (const [key, byUser] of saved.ratings) ratings.set(key, new Map(byUser));
  for (const [key, count] of saved.views) views.set(key, count);
  for (const key of saved.countedToday) countedToday.add(key);
  comments.push(...saved.comments.map((c) => ({ ...c, reactions: new Map(c.reactions) })));
  watchlist.push(...saved.watchlist);
  history.push(...saved.history);
}

export class MockUnauthorized extends Error {}
export class MockForbidden extends Error {}
export class MockValidation extends Error {
  constructor(readonly fields: Record<string, string[]>) {
    super("Validation error");
  }
}

/* --- Accounts ------------------------------------------------------------- */

interface MockAccount {
  user: UserDto;
  password: string;
}

let nextUserId = 1;
const accounts = new Map<string, MockAccount>();
/** access token → email. Opaque to the client, exactly like the real one. */
const sessions = new Map<string, string>();

function issueToken(email: string): string {
  const token = `mock.${Math.random().toString(36).slice(2)}.${Date.now()}`;
  sessions.set(token, email);
  return token;
}

export function createAccount(input: {
  email: string;
  username?: string;
  password: string;
  password_confirm: string;
}): UserDto {
  const email = input.email.trim().toLowerCase();

  if (!email) throw new MockValidation({ email: ["Укажите почту."] });
  if (accounts.has(email)) {
    throw new MockValidation({ email: ["Аккаунт с такой почтой уже существует."] });
  }
  if (input.password !== input.password_confirm) {
    throw new MockValidation({ password_confirm: ["Пароли не совпадают."] });
  }
  if (input.password.length < 8) {
    throw new MockValidation({ password: ["Пароль короче восьми символов."] });
  }

  const username = input.username?.trim() || email.split("@")[0];
  const user: UserDto = {
    id: nextUserId++,
    email,
    username,
    display_name: username,
    first_name: "",
    last_name: "",
    avatar: null,
    bio: "",
    birth_date: null,
    preferred_language: "ru",
    is_staff: false,
    is_comment_banned: false,
    date_joined: new Date().toISOString(),
  };

  accounts.set(email, { user, password: input.password });
  persist();
  return user;
}

export function authenticate(email: string, password: string): UserDto {
  const account = accounts.get(email.trim().toLowerCase());
  if (!account || account.password !== password) throw new MockUnauthorized();
  return account.user;
}

export function tokensFor(user: UserDto): { access: string; refresh: string } {
  const pair = { access: issueToken(user.email), refresh: issueToken(user.email) };
  persist();
  return pair;
}

export function userForToken(token: string | undefined): UserDto | null {
  if (!token) return null;
  const email = sessions.get(token);
  if (!email) return null;
  return accounts.get(email)?.user ?? null;
}

export function revokeToken(token: string): void {
  sessions.delete(token);
  persist();
}

export function requireUser(token: string | undefined): UserDto {
  const user = userForToken(token);
  if (!user) throw new MockUnauthorized();
  return user;
}

export function updateAccount(user: UserDto, patch: ProfileUpdateDto): UserDto {
  const account = accounts.get(user.email);
  if (!account) throw new MockUnauthorized();

  Object.assign(account.user, {
    username: patch.username ?? account.user.username,
    first_name: patch.first_name ?? account.user.first_name,
    last_name: patch.last_name ?? account.user.last_name,
    bio: patch.bio ?? account.user.bio,
    birth_date: patch.birth_date === undefined ? account.user.birth_date : patch.birth_date,
    preferred_language: patch.preferred_language ?? account.user.preferred_language,
  });
  account.user.display_name =
    [account.user.first_name, account.user.last_name].filter(Boolean).join(" ") ||
    account.user.username;

  persist();
  return account.user;
}

export function setPassword(user: UserDto, oldPassword: string, newPassword: string): void {
  const account = accounts.get(user.email);
  if (!account) throw new MockUnauthorized();
  if (account.password !== oldPassword) {
    throw new MockValidation({ old_password: ["Текущий пароль не подходит."] });
  }
  if (newPassword.length < 8) {
    throw new MockValidation({ new_password: ["Пароль короче восьми символов."] });
  }
  account.password = newPassword;
  persist();
}

export function findByUsername(username: string): UserDto | null {
  for (const account of accounts.values()) {
    if (account.user.username === username) return account.user;
  }
  return null;
}

export function publicUser(user: UserDto): PublicUserDto {
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    avatar: user.avatar,
  };
}

/* --- Content references ---------------------------------------------------- */

export type MockContentType = ContentRefDto["type"];

/** Resolves the card every `/me/` row carries, straight out of the fixtures. */
export function contentRef(type: MockContentType, id: number): ContentRefDto {
  if (type === "movie") {
    const movie = mockMovies.find((entry) => entry.list.id === id)?.list;
    return {
      type,
      id,
      title: movie?.title ?? null,
      poster: movie?.poster ?? null,
      year: movie?.year ?? null,
      series_id: null,
      season_number: null,
      episode_number: null,
    };
  }

  if (type === "series") {
    const series = mockSeries.find((entry) => entry.list.id === id)?.list;
    return {
      type,
      id,
      title: series?.title ?? null,
      poster: series?.poster ?? null,
      year: series?.year ?? null,
      series_id: null,
      season_number: null,
      episode_number: null,
    };
  }

  for (const entry of mockSeries) {
    for (const season of entry.detail.seasons) {
      for (const episode of season.episodes) {
        if (episode.id !== id) continue;
        return {
          type,
          id,
          title: episode.translations.ru?.title ?? `Эпизод ${episode.number}`,
          poster: episode.thumbnail ?? entry.list.poster,
          year: season.year,
          series_id: entry.list.id,
          season_number: season.number,
          episode_number: episode.number,
        };
      }
    }
  }

  return {
    type,
    id,
    title: null,
    poster: null,
    year: null,
    series_id: null,
    season_number: null,
    episode_number: null,
  };
}

const contentKey = (type: MockContentType, id: number) => `${type}:${id}`;

/**
 * The denormalised counters the catalog serialisers carry. Computed rather than
 * stored: the fixtures are static, and a card that disagreed with the rating
 * block one scroll below it would be worse than no number at all.
 */
export function statsFor(type: MockContentType, id: number) {
  const scores = [...ratingsFor(type, id).values()];

  return {
    views_count: views.get(contentKey(type, id)) ?? 0,
    rating_avg: scores.length
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length
      : null,
    rating_count: scores.length,
    comment_count: comments.filter(
      (comment) => comment.contentType === type && comment.contentId === id && !comment.isDeleted,
    ).length,
  };
}

/* --- Ratings --------------------------------------------------------------- */

/** content key → user id → score. */
const ratings = new Map<string, Map<number, number>>();

function ratingsFor(type: MockContentType, id: number): Map<number, number> {
  const key = contentKey(type, id);
  let entry = ratings.get(key);
  if (!entry) {
    entry = new Map();
    ratings.set(key, entry);
  }
  return entry;
}

export function ratingSummary(
  type: MockContentType,
  id: number,
  viewer: UserDto | null,
): RatingSummaryDto {
  const scores = [...ratingsFor(type, id).values()];
  const distribution: Record<string, number> = {};
  for (let score = 0; score <= 10; score += 1) distribution[score] = 0;
  for (const score of scores) distribution[score] += 1;

  return {
    average: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null,
    count: scores.length,
    distribution,
    my_rating: viewer ? (ratingsFor(type, id).get(viewer.id) ?? null) : null,
  };
}

export function setRating(
  type: MockContentType,
  id: number,
  viewer: UserDto,
  value: number,
): RatingSummaryDto {
  if (!Number.isInteger(value) || value < 0 || value > 10) {
    throw new MockValidation({ value: ["Оценка вне диапазона 0–10."] });
  }
  ratingsFor(type, id).set(viewer.id, value);
  persist();
  return ratingSummary(type, id, viewer);
}

export function clearRating(
  type: MockContentType,
  id: number,
  viewer: UserDto,
): RatingSummaryDto {
  ratingsFor(type, id).delete(viewer.id);
  persist();
  return ratingSummary(type, id, viewer);
}

export function listRatings(viewer: UserDto) {
  const result: Array<{ id: number; value: number; content: ContentRefDto; updated_at: string }> =
    [];

  for (const [key, byUser] of ratings) {
    const value = byUser.get(viewer.id);
    if (value === undefined) continue;
    const [type, rawId] = key.split(":");
    result.push({
      id: Number(rawId) * 10 + viewer.id,
      value,
      content: contentRef(type as MockContentType, Number(rawId)),
      updated_at: new Date().toISOString(),
    });
  }

  return result;
}

/* --- Views ----------------------------------------------------------------- */

const views = new Map<string, number>();
const countedToday = new Set<string>();

export function countView(type: MockContentType, id: number, visitor: string) {
  const key = contentKey(type, id);
  const seen = `${key}|${visitor}`;
  const counted = !countedToday.has(seen);

  if (counted) {
    countedToday.add(seen);
    views.set(key, (views.get(key) ?? 0) + 1);
    persist();
  }

  return { views_count: views.get(key) ?? 0, counted };
}

/* --- Comments -------------------------------------------------------------- */

interface MockComment {
  id: number;
  contentType: MockContentType;
  contentId: number;
  userId: number;
  parent: number | null;
  body: string;
  isSpoiler: boolean;
  isDeleted: boolean;
  isEdited: boolean;
  reactions: Map<number, 1 | -1>;
  createdAt: string;
}

let nextCommentId = 1;
const comments: MockComment[] = [];

function userById(id: number): UserDto | null {
  for (const account of accounts.values()) {
    if (account.user.id === id) return account.user;
  }
  return null;
}

function toCommentDto(comment: MockComment, viewer: UserDto | null): CommentDto {
  const author = userById(comment.userId);
  const reactions = [...comment.reactions.values()];

  return {
    id: comment.id,
    user: author
      ? publicUser(author)
      : { id: comment.userId, username: "deleted", display_name: "Аккаунт удалён", avatar: null },
    parent: comment.parent,
    body: comment.isDeleted ? "" : comment.body,
    is_spoiler: comment.isSpoiler,
    is_deleted: comment.isDeleted,
    is_edited: comment.isEdited,
    likes: reactions.filter((value) => value === 1).length,
    dislikes: reactions.filter((value) => value === -1).length,
    my_reaction: viewer ? (comment.reactions.get(viewer.id) ?? null) : null,
    reply_count: comments.filter((reply) => reply.parent === comment.id).length,
    created_at: comment.createdAt,
    updated_at: comment.createdAt,
  };
}

export function listComments(
  type: MockContentType,
  id: number,
  viewer: UserDto | null,
  ordering: string | undefined,
): CommentThreadDto[] {
  const roots = comments.filter(
    (comment) => comment.contentType === type && comment.contentId === id && !comment.parent,
  );

  const sorted = [...roots].sort((a, b) => {
    if (ordering === "old") return Date.parse(a.createdAt) - Date.parse(b.createdAt);
    if (ordering === "top") {
      const score = (comment: MockComment) =>
        [...comment.reactions.values()].reduce((sum, value) => sum + value, 0);
      return score(b) - score(a);
    }
    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });

  return sorted
    .filter((root) => !root.isDeleted || comments.some((reply) => reply.parent === root.id))
    .map((root) => ({
      ...toCommentDto(root, viewer),
      replies: comments
        .filter((reply) => reply.parent === root.id)
        .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
        .map((reply) => toCommentDto(reply, viewer)),
    }));
}

export function addComment(
  type: MockContentType,
  id: number,
  viewer: UserDto,
  input: { body: string; is_spoiler?: boolean; parent?: number | null },
): CommentThreadDto {
  if (viewer.is_comment_banned) throw new MockForbidden();
  if (!input.body?.trim()) throw new MockValidation({ body: ["Комментарий пустой."] });

  // A reply to a reply is re-parented to the thread root, as the backend does.
  const parent = comments.find((comment) => comment.id === input.parent);
  const root = parent?.parent ? comments.find((c) => c.id === parent.parent) : parent;

  const comment: MockComment = {
    id: nextCommentId++,
    contentType: type,
    contentId: id,
    userId: viewer.id,
    parent: root?.id ?? null,
    body: input.body.trim(),
    isSpoiler: Boolean(input.is_spoiler),
    isDeleted: false,
    isEdited: false,
    reactions: new Map(),
    createdAt: new Date().toISOString(),
  };

  comments.push(comment);
  persist();
  return { ...toCommentDto(comment, viewer), replies: [] };
}

function findComment(id: number): MockComment {
  const comment = comments.find((entry) => entry.id === id);
  if (!comment) throw new MockValidation({ detail: ["Комментарий не найден."] });
  return comment;
}

export function getComment(id: number, viewer: UserDto | null): CommentDto {
  return toCommentDto(findComment(id), viewer);
}

export function editComment(
  id: number,
  viewer: UserDto,
  input: { body?: string; is_spoiler?: boolean },
) {
  const comment = findComment(id);
  if (comment.userId !== viewer.id && !viewer.is_staff) throw new MockForbidden();

  if (input.body !== undefined) comment.body = input.body;
  if (input.is_spoiler !== undefined) comment.isSpoiler = input.is_spoiler;
  comment.isEdited = true;
  persist();

  return { body: comment.body, is_spoiler: comment.isSpoiler };
}

export function deleteComment(id: number, viewer: UserDto): void {
  const comment = findComment(id);
  if (comment.userId !== viewer.id && !viewer.is_staff) throw new MockForbidden();

  // Soft delete while replies hang off it, hard delete otherwise — the same
  // rule the schema describes.
  if (comments.some((reply) => reply.parent === comment.id)) {
    comment.isDeleted = true;
    comment.body = "";
  } else {
    comments.splice(comments.indexOf(comment), 1);
  }
  persist();
}

export function reactToComment(id: number, viewer: UserDto, value: 1 | -1) {
  const comment = findComment(id);
  if (comment.userId === viewer.id) throw new MockForbidden();

  // Sending the reaction already held clears it.
  if (comment.reactions.get(viewer.id) === value) comment.reactions.delete(viewer.id);
  else comment.reactions.set(viewer.id, value);
  persist();

  const reactions = [...comment.reactions.values()];
  return {
    likes: reactions.filter((entry) => entry === 1).length,
    dislikes: reactions.filter((entry) => entry === -1).length,
    my_reaction: comment.reactions.get(viewer.id) ?? null,
  };
}

export function listMyComments(viewer: UserDto): MyCommentDto[] {
  return comments
    .filter((comment) => comment.userId === viewer.id)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .map((comment) => ({
      ...toCommentDto(comment, viewer),
      content: contentRef(comment.contentType, comment.contentId),
    }));
}

/* --- Watchlist ------------------------------------------------------------- */

interface MockWatchlistEntry {
  id: number;
  userId: number;
  type: MockContentType;
  contentId: number;
  status: WatchlistStatus;
  isFavorite: boolean;
  note: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS_LABELS: Record<WatchlistStatus, string> = {
  planned: "Буду смотреть",
  watching: "Смотрю",
  completed: "Посмотрел",
  dropped: "Бросил",
};

let nextWatchlistId = 1;
const watchlist: MockWatchlistEntry[] = [];

function toWatchlistDto(entry: MockWatchlistEntry): WatchlistItemDto {
  return {
    id: entry.id,
    content: contentRef(entry.type, entry.contentId),
    status: entry.status,
    status_display: STATUS_LABELS[entry.status],
    is_favorite: entry.isFavorite,
    note: entry.note,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
  };
}

export function getWatchlistEntry(
  type: MockContentType,
  id: number,
  viewer: UserDto,
): WatchlistItemDto | null {
  const entry = watchlist.find(
    (candidate) =>
      candidate.userId === viewer.id && candidate.type === type && candidate.contentId === id,
  );
  return entry ? toWatchlistDto(entry) : null;
}

export function saveWatchlistEntry(
  type: MockContentType,
  id: number,
  viewer: UserDto,
  input: { status?: WatchlistStatus; is_favorite?: boolean; note?: string },
): WatchlistItemDto {
  let entry = watchlist.find(
    (candidate) =>
      candidate.userId === viewer.id && candidate.type === type && candidate.contentId === id,
  );

  if (!entry) {
    entry = {
      id: nextWatchlistId++,
      userId: viewer.id,
      type,
      contentId: id,
      status: "planned",
      isFavorite: false,
      note: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    watchlist.push(entry);
  }

  if (input.status) entry.status = input.status;
  if (input.is_favorite !== undefined) entry.isFavorite = input.is_favorite;
  if (input.note !== undefined) entry.note = input.note;
  entry.updatedAt = new Date().toISOString();
  persist();

  return toWatchlistDto(entry);
}

export function removeWatchlistEntry(type: MockContentType, id: number, viewer: UserDto): void {
  const index = watchlist.findIndex(
    (candidate) =>
      candidate.userId === viewer.id && candidate.type === type && candidate.contentId === id,
  );
  if (index >= 0) watchlist.splice(index, 1);
  persist();
}

export function listWatchlist(
  viewer: UserDto,
  filters: { status?: string; favorite?: string },
): WatchlistItemDto[] {
  return watchlist
    .filter((entry) => entry.userId === viewer.id)
    .filter((entry) => !filters.status || entry.status === filters.status)
    .filter((entry) => filters.favorite !== "true" || entry.isFavorite)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .map(toWatchlistDto);
}

/* --- Watch progress -------------------------------------------------------- */

interface MockHistoryEntry {
  id: number;
  userId: number;
  type: MockContentType;
  contentId: number;
  position: number;
  duration: number | null;
  isFinished: boolean;
  createdAt: string;
  watchedAt: string;
}

let nextHistoryId = 1;
const history: MockHistoryEntry[] = [];

function progressOf(entry: MockHistoryEntry): number {
  if (!entry.duration || entry.duration <= 0) return 0;
  return Math.min(100, Math.round((entry.position / entry.duration) * 100));
}

function toHistoryDto(entry: MockHistoryEntry): WatchHistoryDto {
  return {
    id: entry.id,
    content: contentRef(entry.type, entry.contentId),
    position_seconds: entry.position,
    duration_seconds: entry.duration,
    progress: progressOf(entry),
    is_finished: entry.isFinished,
    created_at: entry.createdAt,
    watched_at: entry.watchedAt,
  };
}

export function getProgress(
  type: MockContentType,
  id: number,
  viewer: UserDto,
): WatchHistoryDto | null {
  const entry = history.find(
    (candidate) =>
      candidate.userId === viewer.id && candidate.type === type && candidate.contentId === id,
  );
  return entry ? toHistoryDto(entry) : null;
}

export function saveProgress(
  type: MockContentType,
  id: number,
  viewer: UserDto,
  input: { position_seconds: number; duration_seconds?: number | null; is_finished?: boolean },
): WatchHistoryDto {
  let entry = history.find(
    (candidate) =>
      candidate.userId === viewer.id && candidate.type === type && candidate.contentId === id,
  );

  if (!entry) {
    entry = {
      id: nextHistoryId++,
      userId: viewer.id,
      type,
      contentId: id,
      position: 0,
      duration: null,
      isFinished: false,
      createdAt: new Date().toISOString(),
      watchedAt: new Date().toISOString(),
    };
    history.push(entry);
  }

  entry.position = Math.max(0, input.position_seconds);
  if (input.duration_seconds) entry.duration = input.duration_seconds;
  entry.watchedAt = new Date().toISOString();
  // Past 90 % the entry flips on its own, exactly as documented.
  entry.isFinished = input.is_finished ?? (progressOf(entry) >= 90 || entry.isFinished);
  persist();

  return toHistoryDto(entry);
}

export function clearProgress(type: MockContentType, id: number, viewer: UserDto): void {
  const index = history.findIndex(
    (candidate) =>
      candidate.userId === viewer.id && candidate.type === type && candidate.contentId === id,
  );
  if (index >= 0) history.splice(index, 1);
  persist();
}

export function listHistory(viewer: UserDto, finished?: string): WatchHistoryDto[] {
  return history
    .filter((entry) => entry.userId === viewer.id)
    .filter((entry) => finished === undefined || entry.isFinished === (finished === "true"))
    .sort((a, b) => Date.parse(b.watchedAt) - Date.parse(a.watchedAt))
    .map(toHistoryDto);
}

export function listContinueWatching(viewer: UserDto): WatchHistoryDto[] {
  return history
    .filter((entry) => entry.userId === viewer.id && !entry.isFinished && progressOf(entry) >= 1)
    .sort((a, b) => Date.parse(b.watchedAt) - Date.parse(a.watchedAt))
    .map(toHistoryDto);
}

/* --- Seed ------------------------------------------------------------------ */

/**
 * A populated mock is worth more than an empty one: an empty comment thread and
 * an unrated title exercise none of the layout that has to survive real data.
 *
 * Seeding also gives the public profile route something to resolve. That page
 * renders on the server, and the server half of the mock cannot see the browser
 * storage above — so an account registered in the browser is not visible there.
 * The seeded ones are, because both halves seed identically.
 */
function seed(): void {
  const masha = createAccount({
    email: "masha@evade.local",
    username: "masha",
    password: "evade-demo",
    password_confirm: "evade-demo",
  });
  const igor = createAccount({
    email: "igor@evade.local",
    username: "igor",
    password: "evade-demo",
    password_confirm: "evade-demo",
  });

  setRating("movie", 101, masha, 9);
  setRating("movie", 101, igor, 7);
  setRating("movie", 102, masha, 6);
  setRating("series", 201, igor, 8);

  const thread = addComment("movie", 101, masha, {
    body: "Последние двадцать минут держат сильнее, чем весь остальной фильм. Хорошо, что не стали объяснять финал.",
  });
  addComment("movie", 101, igor, {
    body: "Согласен про финал. Хотя чемодан открывают слишком рано.",
    parent: thread.id,
  });
  addComment("movie", 101, igor, {
    body: "Смотритель уходит с маяка ещё в середине, дальше всё происходит у него в голове.",
    is_spoiler: true,
  });
  addComment("series", 201, masha, {
    body: "Второй сезон снят ровнее первого, но первый было интереснее смотреть.",
  });
}

// Restored last: every collection above has to exist before it is filled.
restore();
if (accounts.size === 0) seed();
