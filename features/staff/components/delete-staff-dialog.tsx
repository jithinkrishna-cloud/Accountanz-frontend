"use client";

import { useState } from "react";
import { toast } from "sonner";
import { SubmitButton } from "@/components/shared/submit-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ApiError } from "@/lib/api-client";
import { applyApiError } from "@/lib/form-errors";
import { useDeleteStaff } from "../hooks/use-staff";
import type { StaffMember } from "../types/staff.types";

/**
 * Confirms deleting a person. The API only allows it when they have no work history; when it refuses,
 * the reason is shown here with the alternative (disable the account).
 */
export function DeleteStaffDialog({ member, onClose, onDisableInstead }: { member: StaffMember | null; onClose: () => void; onDisableInstead: (m: StaffMember) => void }) {
  const remove = useDeleteStaff();
  const [blocked, setBlocked] = useState<string | null>(null);

  if (!member) return null;
  const close = () => {
    setBlocked(null);
    onClose();
  };

  const confirm = async () => {
    try {
      await remove.mutateAsync(member.user_id);
      toast.success(`${member.full_name} deleted`);
      close();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setBlocked(err.message);
      else applyApiError(err);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {member.full_name}?</DialogTitle>
          <DialogDescription>
            {member.status === "invited"
              ? "Their invite link stops working and the account is removed. This can't be undone."
              : "The account is removed permanently. This can't be undone."}
          </DialogDescription>
        </DialogHeader>
        {blocked && (
          <Alert variant="destructive">
            <AlertDescription>{blocked}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={close}>Cancel</Button>
          {blocked ? (
            member.status !== "disabled" && (
              <Button onClick={() => { close(); onDisableInstead(member); }}>Disable instead</Button>
            )
          ) : (
            <SubmitButton type="button" variant="destructive" pending={remove.isPending} onClick={() => void confirm()}>Delete</SubmitButton>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
