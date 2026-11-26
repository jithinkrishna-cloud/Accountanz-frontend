"use client";

import { UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from "@/features/auth/hooks/use-session";
import { ROLE_LABELS } from "@/lib/constants";
import { applyApiError } from "@/lib/form-errors";
import { formatDate } from "@/lib/format";
import type { PortalRole } from "@/types/auth";
import { useChangeRole, useRemoveMember } from "../hooks/use-projects";
import { SPACE_ROLE_LABELS, type SpaceRole } from "../types/project.types";
import { AddPeopleDialog } from "./invite-people";
import { UserAvatar } from "./project-ui";
import { useSpaceCtx } from "./space-layout";

/** Space settings → Access: who is in the space and their role. Administrators manage it. */
export function AccessSettings() {
  const { space, members, isAdmin } = useSpaceCtx();
  const { data: me } = useSession();
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const changeRole = useChangeRole(space.space_key);
  const remove = useRemoveMember(space.space_key);
  const rows = members.filter((m) => !q || `${m.full_name} ${m.email}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHeader
        title="Access"
        description={isAdmin ? "Add Accountanz staff to this space and choose their role." : "People in this space. Ask an Administrator to add someone."}
        actions={isAdmin && <Button onClick={() => setAdding(true)}><UserPlus className="size-4" /> Add people</Button>}
      />
      <div className="bg-card rounded-xl border shadow-xs">
        <div className="border-b p-4">
          <SearchInput value={q} onChange={setQ} placeholder="Search people" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr className="text-muted-foreground text-left text-xs">
                <th className="px-4 py-2 font-semibold">Name</th>
                <th className="hidden px-4 py-2 font-semibold md:table-cell">Email</th>
                <th className="hidden px-4 py-2 font-semibold md:table-cell">Added</th>
                <th className="px-4 py-2 font-semibold">Role</th>
                {isAdmin && <th className="px-4 py-2" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.user_id} className="border-b last:border-b-0">
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-3">
                      <UserAvatar name={m.full_name} size="md" />
                      <span>
                        <span className="block font-medium">{m.full_name}{m.user_id === me?.id && <span className="text-muted-foreground font-normal"> (you)</span>}</span>
                        <span className="text-muted-foreground block text-xs">{ROLE_LABELS[m.portal_role as PortalRole] ?? m.portal_role}</span>
                      </span>
                    </span>
                  </td>
                  <td className="hidden px-4 py-2.5 md:table-cell">{m.email}</td>
                  <td className="text-muted-foreground hidden px-4 py-2.5 md:table-cell">{formatDate(m.added_at)}</td>
                  <td className="px-4 py-2.5">
                    {isAdmin ? (
                      <Select value={m.role} onValueChange={(v) => void changeRole.mutateAsync({ userId: m.user_id, role: v as SpaceRole }).catch((e) => applyApiError(e))}>
                        <SelectTrigger size="sm" className="w-40" aria-label={`Role of ${m.full_name}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrator</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      SPACE_ROLE_LABELS[m.role]
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-2.5 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (!window.confirm(`Remove ${m.full_name} from ${space.name}? Their work items stay assigned to them.`)) return;
                          void remove.mutateAsync(m.user_id).then(() => toast.success(`${m.full_name} removed`)).catch((e) => applyApiError(e));
                        }}
                      >
                        Remove
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="text-muted-foreground px-4 py-8 text-center">No people match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <AddPeopleDialog open={adding} onClose={() => setAdding(false)} />
    </>
  );
}
