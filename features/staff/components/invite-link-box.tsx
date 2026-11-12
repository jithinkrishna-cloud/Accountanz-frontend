"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Shows a one-time invite link with a copy button, for sharing it directly with the person. */
export function InviteLinkBox({ url, email, emailSent }: { url: string; email: string; emailSent: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Invite link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy. Select the link and copy it manually.");
    }
  };
  return (
    <div className="bg-muted/50 grid gap-2 rounded-lg border p-3">
      <p className="text-sm">
        {emailSent ? (
          <>We&apos;ve emailed this link to <span className="font-medium">{email}</span>. You can also copy it and send it yourself.</>
        ) : (
          <>Send this link to <span className="font-medium">{email}</span>.</>
        )}{" "}
        They open it to set their own password; it works once and expires in 7 days.
      </p>
      <div className="flex gap-2">
        <Input readOnly value={url} aria-label="Invite link" className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
        <Button type="button" variant="outline" onClick={() => void copy()} className="shrink-0">
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      {!emailSent && <p className="text-muted-foreground text-xs">The email couldn&apos;t be sent, so share the link yourself (e.g. over email or chat).</p>}
    </div>
  );
}
