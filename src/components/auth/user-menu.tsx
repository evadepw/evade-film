"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Bookmark,
  Clock,
  Languages,
  LogIn,
  LogOut,
  MessageSquare,
  Star,
  User,
  UserPlus,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthDialog } from "@/components/auth/auth-dialog";
import { useLocaleSwitch } from "@/hooks/use-locale-switch";
import { useDictionary, useRoutes } from "@/lib/i18n/dictionary-context";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { LOCALES, LOCALE_NAME, type AppLocale } from "@/lib/i18n/locale";
import type { Routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

import { useAuth } from "@/providers/auth-provider";

/** Labels come from the dictionary, so the list is built per render, not once. */
const accountLinks = (t: Dictionary, routes: Routes) =>
  [
    { href: routes.account.root, label: t.account.profile, Icon: User },
    { href: routes.account.watchlist, label: t.account.watchlist, Icon: Bookmark },
    { href: routes.account.ratings, label: t.account.ratings, Icon: Star },
    { href: routes.account.comments, label: t.account.comments, Icon: MessageSquare },
    { href: routes.account.history, label: t.account.history, Icon: Clock },
  ] as const;

/**
 * The account corner of the header — one control, signed in or not.
 *
 * A visitor with no session gets the same circle, drawn hollow: a dashed edge
 * and a generic figure instead of an initial, which says «not you yet» without
 * a word of copy. Behind it sits what a guest can actually do — sign in, sign
 * up, and change the language.
 *
 * The language lives here in both states, so the bar carries two controls
 * rather than a row of them.
 *
 * It renders a placeholder rather than the circle while the stored token is
 * being checked — offering «войти» to someone who is already signed in, for
 * the half-second it takes `/auth/me/` to answer, is worse than a blank.
 */
export function UserMenu() {
  const t = useDictionary();
  const routes = useRoutes();

  const { viewer, isLoading, logout } = useAuth();
  const router = useRouter();

  /** The dialog the guest items open — `null` while it is closed. */
  const [authMode, setAuthMode] = useState<"signIn" | "signUp" | null>(null);

  if (isLoading) return <Skeleton className="size-9 rounded-full" />;

  async function handleSignOut() {
    await logout();
    toast.success(t.auth.signedOut);
    // Account pages are behind the session; drop back to the catalogue.
    router.push(routes.home);
    router.refresh();
  }

  const initial = viewer ? (viewer.displayName || viewer.username).slice(0, 1) : null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={viewer ? t.account.title : t.auth.guest}
            className="rounded-full outline-none transition-opacity duration-150 ease-evade hover:opacity-85"
          >
            <Avatar className={cn(!viewer && "border-dashed border-silver-a20")}>
              {viewer?.avatar ? <AvatarImage src={viewer.avatar} alt="" /> : null}
              <AvatarFallback className={cn(!viewer && "bg-transparent")}>
                {initial ?? <User size={16} strokeWidth={1.5} />}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-60">
          {viewer ? (
            <>
              <DropdownMenuLabel className="flex flex-col gap-1">
                <span className="text-body-sm font-semibold text-foreground">
                  {viewer.displayName}
                </span>
                <span className="truncate text-caption font-normal text-muted-foreground">
                  {viewer.email}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {accountLinks(t, routes).map(({ href, label, Icon }) => (
                <DropdownMenuItem key={href} asChild>
                  <Link href={href}>
                    <Icon strokeWidth={1.5} />
                    {label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </>
          ) : (
            <>
              <DropdownMenuLabel className="flex flex-col gap-1">
                <span className="text-body-sm font-semibold text-foreground">{t.auth.guest}</span>
                <span className="text-caption font-normal text-wrap text-muted-foreground">
                  {t.auth.signInHint}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem onSelect={() => setAuthMode("signIn")}>
                <LogIn strokeWidth={1.5} />
                {t.auth.signIn}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setAuthMode("signUp")}>
                <UserPlus strokeWidth={1.5} />
                {t.auth.signUp}
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuSeparator />
          <LanguageMenu />

          {viewer ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void handleSignOut()}>
                <LogOut strokeWidth={1.5} />
                {t.auth.signOut}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <AuthDialog
        open={authMode !== null}
        onOpenChange={(open) => setAuthMode(open ? authMode : null)}
        initialMode={authMode ?? "signIn"}
      />
    </>
  );
}

/**
 * The language, as a submenu rather than a pair of buttons: two languages fit
 * in a row, five do not, and the row would have to be redesigned the day a
 * third arrives. The trigger carries the current one so the choice is legible
 * without opening it.
 */
function LanguageMenu() {
  const t = useDictionary();
  const { current, switchTo } = useLocaleSwitch();

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Languages strokeWidth={1.5} />
        {t.account.language}
        <span className="ml-auto pl-3 text-caption text-muted-foreground">
          {LOCALE_NAME[current]}
        </span>
      </DropdownMenuSubTrigger>

      <DropdownMenuSubContent className="min-w-40">
        <DropdownMenuRadioGroup
          value={current}
          onValueChange={(next) => switchTo(next as AppLocale)}
        >
          {LOCALES.map((locale) => (
            <DropdownMenuRadioItem key={locale} value={locale}>
              {LOCALE_NAME[locale]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
