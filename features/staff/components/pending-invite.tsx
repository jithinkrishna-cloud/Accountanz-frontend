"use client";

import { Link2 } from "lucide-react";
import { useState } from "react";
import { SubmitButton } from "@/components/shared/submit-button";
import { applyApiError } from "@/lib/form-errors";
import { useIssueInviteLink } from "../hooks/use-staff";
import type { StaffMember } from "../types/staff.types";
import { InviteLinkBox } from "./invite-link-box";

/** For someone who hasn't set a password yet: issue a fresh invite link to share with them. */
export function PendingInvite({ member }: { member: StaffMember }) {
  const issue = useIssueInviteLink();
  const [link, setLink] = useState<{ url: string; emailSent: boolean } | null>(null);

  const create = async () => {
    try {
      const r = await issue.mutateAsync(member.user_id);
      setLink({ url: r.invite_url, emailSent: r.email_sent });
    } catch (err) {
      applyApiError(err);
    }
  };

  return (
    <section className="grid gap-2 border-t pt-4">
      <h3 className="text-sm font-medium">Pending invite</h3>
      <p className="text-muted-foreground text-sm">{member.full_name} hasn&apos;t set a password yet, so they can&apos;t sign in.</p>
      {link ? (
        <InviteLinkBox url={link.url} email={member.email} emailSent={link.emailSent} />
      ) : (
        <div>
          <SubmitButton type="button" variant="outline" size="sm" pending={issue.isPending} onClick={() => void create()}>
            <Link2 className="size-4" /> Create new invite link
          </SubmitButton>
          <p className="text-muted-foreground mt-1.5 text-xs">Earlier links stop working when you create a new one.</p>
        </div>
      )}
    </section>
  );
}
