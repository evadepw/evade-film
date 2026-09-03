"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bookmark, Clock, LogOut, MessageSquare, Star, User } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { SignInButton } from "@/components/auth/auth-dialog";
import { dictionary } from "@/lib/i18n/dictionary";
import { routes } from "@/lib/routes";
import { useAuth } from "@/providers/auth-provider";

const LINKS = [
  { href: routes.account.root, label: dictionary.account.profile, Icon: User },
  { href: routes.account.watchlist, label: dictionary.account.watchlist, Icon: Bookmark },
  { href: routes.account.ratings, label: dictionary.account.ratings, Icon: Star },
  { href: routes.account.comments, label: dictionary.account.comments, Icon: MessageSquare },
  { href: routes.account.history, label: dictionary.account.history, Icon: Clock },
] as const;

/**
 * The account corner of the header: a sign-in button, or the viewer's avatar
 * over the five `/me/` collections.
 *
 * It renders a placeholder rather than a sign-in button while the stored token
 * is being checked — offering «войти» to someone who is already signed in, for
 * the half-second it takes `/auth/me/` to answer, is worse than a blank.
 */
export function UserMenu() {
  const { viewer, isLoading, logout } = useAuth();
  const router = useRouter();

  if (isLoading) return <Skeleton className="size-9 rounded-full" />;

  if (!viewer) return <SignInButton size="sm" />;

  const initial = (viewer.displayName || viewer.username).slice(0, 1);

  async function handleSignOut() {
    await logout();
    toast.success(dictionary.auth.signedOut);
    // Account pages are behind the session; drop back to the catalogue.
    router.push(routes.home);
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={dictionary.account.title}
          className="rounded-full outline-none transition-opacity duration-150 ease-evade hover:opacity-85"
        >
          <Avatar>
            {viewer.avatar ? <AvatarImage src={viewer.avatar} alt="" /> : null}
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-1">
          <span className="text-body-sm font-semibold text-foreground">{viewer.displayName}</span>
          <span className="truncate text-caption font-normal text-muted-foreground">
            {viewer.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {LINKS.map(({ href, label, Icon }) => (
          <DropdownMenuItem key={href} asChild>
            <Link href={href}>
              <Icon strokeWidth={1.5} />
              {label}
            </Link>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void handleSignOut()}>
          <LogOut strokeWidth={1.5} />
          {dictionary.auth.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
