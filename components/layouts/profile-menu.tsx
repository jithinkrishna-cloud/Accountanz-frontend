"use client";

import { ChevronRight, LogOut, Mail, Monitor, Moon, Settings, ShieldCheck, Sun } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useState, useSyncExternalStore } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLogout } from "@/features/auth/hooks/use-session";
import { ROLE_LABELS } from "@/lib/constants";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Portal, SessionUser } from "@/types/auth";

/** Where each portal keeps its settings; the accountant workspace has none. */
const SETTINGS_HREF: Partial<Record<Portal, string>> = { admin: "/admin/settings", app: "/app/settings" };

function Row({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Icon className="text-muted-foreground size-4 shrink-0" aria-hidden />
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="truncate text-sm">{value}</p>
      </div>
    </div>
  );
}

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

/** Top-bar avatar: opens the profile card under it (email, role, settings, sign out). */
export function ProfileMenu({ portal, user }: { portal: Portal; user: SessionUser }) {
  const [open, setOpen] = useState(false);
  const logout = useLogout();
  const settingsHref = SETTINGS_HREF[portal];
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className="focus-visible:ring-ring/50 rounded-full outline-none focus-visible:ring-[3px]" aria-label="Open your profile">
        <Avatar className="size-8">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials(user.fullName)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10} className="grid w-80 gap-4 p-5">
        <div className="flex flex-col items-center gap-2 text-center">
          <Avatar className="size-14">
            <AvatarFallback className="bg-primary text-primary-foreground text-base">{initials(user.fullName)}</AvatarFallback>
          </Avatar>
          <p className="font-semibold">{user.fullName}</p>
        </div>

        <div className="divide-y rounded-lg border px-4">
          <Row icon={Mail} label="Email" value={user.email} />
          <Row icon={ShieldCheck} label="Role" value={ROLE_LABELS[user.role]} />
        </div>

        <div className="grid gap-2">
          <p className="text-muted-foreground text-xs font-medium">Theme</p>
          <div className="grid grid-cols-3 gap-1 rounded-lg border p-1">
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
              const active = mounted && theme === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                    active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                  )}
                  aria-pressed={active}
                >
                  <Icon className="size-3.5" aria-hidden />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="-mx-2 grid gap-0.5 border-t pt-2">
          {settingsHref && (
            <Link
              href={settingsHref}
              onClick={() => setOpen(false)}
              className="hover:bg-accent focus-visible:bg-accent flex items-center gap-3 rounded-md px-3 py-2 text-sm outline-none transition-colors"
            >
              <Settings className="text-muted-foreground size-4" aria-hidden />
              <span className="flex-1">Settings</span>
              <ChevronRight className="text-muted-foreground size-4" aria-hidden />
            </Link>
          )}
          <button
            type="button"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10 flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm outline-none transition-colors disabled:opacity-50"
          >
            <LogOut className="size-4" aria-hidden />
            {logout.isPending ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
