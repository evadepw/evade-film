"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Bookmark, BookmarkCheck, Check, ChevronDown, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AuthDialog } from "@/components/auth/auth-dialog";
import { useWatchlist } from "@/hooks/use-interactions";
import type { ShelvableType } from "@/lib/api/services/interactions.service";
import { ApiError } from "@/lib/api/errors";
import { useDictionary } from "@/lib/i18n/dictionary-context";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { cn } from "@/lib/utils";
import type { WatchlistStatus } from "@/lib/domain/models";

export interface WatchlistButtonProps {
  type: ShelvableType;
  id: number;
  size?: "default" | "lg";
  className?: string;
}

export const statusLabels = (t: Dictionary): Record<WatchlistStatus, string> => ({
  planned: t.watchlist.planned,
  watching: t.watchlist.watching,
  completed: t.watchlist.completed,
  dropped: t.watchlist.dropped,
});

/** The order the menu offers them in — a shelf life, not alphabetical. */
const STATUSES: WatchlistStatus[] = ["planned", "watching", "completed", "dropped"];

/**
 * Shelving a title.
 *
 * One control, not three: the backend keeps status and «избранное» on a single
 * row, so a star and a status picker that could disagree with each other would
 * be a UI invention the data cannot back. The button adds the title, its menu
 * moves it between statuses, and the star toggles the flag on that same row.
 */
export function WatchlistButton({ type, id, size = "default", className }: WatchlistButtonProps) {
  const t = useDictionary();
  const labels = statusLabels(t);

  const { shelf, isLoading, setStatus, toggleFavorite, add, remove } = useWatchlist(type, id);
  const [authOpen, setAuthOpen] = useState(false);

  async function run(action: () => Promise<unknown>) {
    try {
      await action();
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthorized) {
        setAuthOpen(true);
        return;
      }
      toast.error(error instanceof ApiError ? error.message : t.error.title);
    }
  }

  if (!shelf) {
    return (
      <>
        <Button
          type="button"
          variant="outline"
          size={size}
          disabled={isLoading}
          className={className}
          onClick={() => void run(add)}
        >
          <Bookmark strokeWidth={1.5} />
          {t.watchlist.add}
        </Button>
        <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      </>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="secondary" size={size}>
            <BookmarkCheck strokeWidth={1.5} />
            {labels[shelf.status]}
            <ChevronDown strokeWidth={1.5} className="opacity-60" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-52">
          {STATUSES.map((status) => (
            <DropdownMenuItem key={status} onSelect={() => void run(() => setStatus(status))}>
              {labels[status]}
              {shelf.status === status ? (
                <Check strokeWidth={1.5} className="ml-auto size-4" />
              ) : null}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void run(remove)}>
            {t.watchlist.remove}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        type="button"
        variant="ghost"
        size={size === "lg" ? "icon-lg" : "icon"}
        aria-pressed={shelf.isFavorite}
        aria-label={
          shelf.isFavorite ? t.watchlist.unfavorite : t.watchlist.favorite
        }
        onClick={() => void run(toggleFavorite)}
      >
        <Star
          strokeWidth={1.5}
          className={cn(shelf.isFavorite && "fill-silver-1 text-silver-1")}
        />
      </Button>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
