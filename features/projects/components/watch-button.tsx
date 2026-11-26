"use client";

import { Eye, EyeOff, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/features/auth/hooks/use-session";
import { applyApiError } from "@/lib/form-errors";
import { cn } from "@/lib/utils";
import { useAddWatcher, useRemoveWatcher, useWatchers } from "../hooks/use-projects";
import { UserAvatar } from "./project-ui";
import { useSpaceCtx } from "./space-layout";

/**
 * Eye button with the watcher count. Opens a menu to start or stop watching, see who watches,
 * and add other space members. You can remove yourself; space Administrators can remove anyone.
 */
export function WatchButton({ number }: { number: number }) {
  const { space, members, isAdmin } = useSpaceCtx();
  const { data: me } = useSession();
  const watchers = useWatchers(space.space_key, number);
  const add = useAddWatcher(space.space_key, number);
  const remove = useRemoveWatcher(space.space_key, number);
  const list = watchers.data ?? [];
  const watching = !!me && list.some((w) => w.user_id === me.id);
  const others = members.filter((m) => !list.some((w) => w.user_id === m.user_id));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label={`Watchers: ${list.length}${watching ? ", you are watching" : ""}`}
          title={watching ? "You're watching this work item" : "Watch this work item"}
          className={cn("gap-1.5 tabular-nums", watching && "border-primary/50 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary")}
        >
          <Eye className="size-4" aria-hidden />
          {list.length}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {me && (
          <DropdownMenuItem
            disabled={add.isPending || remove.isPending}
            onClick={() => void (watching ? remove.mutateAsync(me.id) : add.mutateAsync(me.id)).catch((e) => applyApiError(e))}
          >
            {watching ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            {watching ? "Stop watching" : "Start watching"}
          </DropdownMenuItem>
        )}
        {others.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2">
              <UserPlus className="text-muted-foreground size-4" /> Add watcher
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-72 w-60 overflow-y-auto">
              {others.map((m) => (
                <DropdownMenuItem key={m.user_id} onClick={() => void add.mutateAsync(m.user_id).catch((e) => applyApiError(e))}>
                  <UserAvatar name={m.full_name} size="xs" />
                  <span className="truncate">{m.full_name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-muted-foreground text-xs font-medium">
          {list.length === 0 ? "No one is watching yet" : `Watching (${list.length})`}
        </DropdownMenuLabel>
        {list.map((w) => {
          const canRemove = w.user_id === me?.id || isAdmin;
          return (
            <div key={w.user_id} className="flex items-center gap-2 px-2 py-1.5 text-sm">
              <UserAvatar name={w.full_name} size="xs" />
              <span className="min-w-0 flex-1 truncate">
                {w.full_name}
                {w.user_id === me?.id && <span className="text-muted-foreground"> (you)</span>}
              </span>
              {canRemove && (
                <button
                  type="button"
                  aria-label={`Remove ${w.full_name} from watchers`}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground rounded p-0.5"
                  onClick={() => void remove.mutateAsync(w.user_id).catch((e) => applyApiError(e))}
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
