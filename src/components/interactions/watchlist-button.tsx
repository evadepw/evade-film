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
import { dictionary } from "@/lib/i18n/dictionary";
import { cn } from "@/lib/utils";
import type { WatchlistStatus } from "@/lib/domain/models";

export interface WatchlistButtonProps {
  type: ShelvableType;
  id: number;
  size?: "default" | "lg";
  className?: string;
}

export const STATUS_LABELS: Record<WatchlistStatus, string> = {
  planned: dictionary.watchlist.planned,
  watching: dictionary.watchlist.watching,
  completed: dictionary.watchlist.completed,
  dropped: dictionary.watchlist.dropped,
};

const STATUSES = Object.keys(STATUS_LABELS) as WatchlistStatus[];

/**
 * Shelving a title.
 *
 * One control, not three: the backend keeps status and «избранное» on a single
 * row, so a star and a status picker that could disagree with each other would
 * be a UI invention the data cannot back. The button adds the title, its menu
 * moves it between statuses, and the star toggles the flag on that same row.
 */
export function WatchlistButton({ type, id, size = "default", className }: WatchlistButtonProps) {
  const { entry, isLoading, isSaving, setStatus, toggleFavorite, add, remove } = useWatchlist(
    type,
    id,
  );
  const [authOpen, setAuthOpen] = useState(false);

  async function run(action: () => Promise<unknown>) {
    try {
      await action();
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthorized) {
        setAuthOpen(true);
        return;
      }
      toast.error(error instanceof ApiError ? error.message : dictionary.error.title);
    }
  }

  if (!entry) {
    return (
      <>
        <Button
          type="button"
          variant="outline"
          size={size}
          disabled={isLoading || isSaving}
          className={className}
          onClick={() => void run(add)}
        >
          <Bookmark strokeWidth={1.5} />
          {dictionary.watchlist.add}
        </Button>
        <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      </>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="secondary" size={size} disabled={isSaving}>
            <BookmarkCheck strokeWidth={1.5} />
            {STATUS_LABELS[entry.status]}
            <ChevronDown strokeWidth={1.5} className="opacity-60" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-52">
          {STATUSES.map((status) => (
            <DropdownMenuItem key={status} onSelect={() => void run(() => setStatus(status))}>
              {STATUS_LABELS[status]}
              {entry.status === status ? (
                <Check strokeWidth={1.5} className="ml-auto size-4" />
              ) : null}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void run(remove)}>
            {dictionary.watchlist.remove}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        type="button"
        variant="ghost"
        size={size === "lg" ? "icon-lg" : "icon"}
        disabled={isSaving}
        aria-pressed={entry.isFavorite}
        aria-label={
          entry.isFavorite ? dictionary.watchlist.unfavorite : dictionary.watchlist.favorite
        }
        onClick={() => void run(toggleFavorite)}
      >
        <Star
          strokeWidth={1.5}
          className={cn(entry.isFavorite && "fill-silver-1 text-silver-1")}
        />
      </Button>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
