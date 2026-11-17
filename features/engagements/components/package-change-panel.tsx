"use client";

import { ArrowRightLeft, Check, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { usePackages } from "@/features/services/hooks/use-catalogue";
import { applyApiError } from "@/lib/form-errors";
import { formatDate, formatINR } from "@/lib/format";
import { useChangePackage, useDecidePackageChange } from "../hooks/use-engagements";
import type { Engagement } from "../types/engagement.types";

/** What a package change does to the engagement, by status. Mirrors applyChange in the backend. */
export const changeEffect = (status: Engagement["status"]) =>
  status === "active"
    ? "The new package and fee are billed from the next invoice."
    : status === "sent" || status === "accepted"
      ? "The engagement goes back to draft: send the client a new agreement for the new package."
      : "The draft simply switches package.";

const parseFee = (v: string): number | null | "invalid" => {
  if (!v.trim()) return null;
  return /^\d{1,10}(\.\d{1,2})?$/.test(v.trim()) ? Number(v) : "invalid";
};

/** The client's open request to move to another package: staff approve (confirming the fee) or decline. */
export function PendingPackageChange({ row }: { row: Engagement }) {
  const decide = useDecidePackageChange();
  const packages = usePackages();
  const target = packages.data?.find((p) => p.id === row.pending_change_package_id);
  const [fee, setFee] = useState("");
  const [declining, setDeclining] = useState(false);
  const [note, setNote] = useState("");
  if (!row.pending_change_id) return null;

  async function answer(decision: "approved" | "declined") {
    const parsed = parseFee(fee);
    if (decision === "approved" && parsed === "invalid") {
      toast.error("Enter the fee as an amount with at most 2 decimals, or leave it empty for the list price");
      return;
    }
    if (decision === "declined" && note.trim().length < 3) {
      toast.error("Tell the client why");
      return;
    }
    try {
      await decide.mutateAsync({ requestId: row.pending_change_id!, decision, monthly_fee: decision === "approved" ? (parsed as number | null) : null, note: note.trim() || null });
      toast.success(decision === "approved" ? `Moved to ${row.pending_change_package_name}` : "Request declined");
      setDeclining(false);
      setNote("");
    } catch (err) {
      applyApiError(err);
    }
  }

  return (
    <section aria-labelledby="change-heading" className="space-y-3 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sky-950">
      <div>
        <h3 id="change-heading" className="flex items-center gap-1.5 text-sm font-medium">
          <ArrowRightLeft className="size-4" aria-hidden /> Package change requested
        </h3>
        <p className="mt-1 text-sm">
          {row.pending_change_source === "client" ? "The client" : "Staff"} asked on {formatDate(row.pending_change_at)} to move from <span className="font-medium">{row.package_name}</span> to{" "}
          <span className="font-medium">{row.pending_change_package_name}</span>
          {target ? ` (lists at ${formatINR(target.monthly_fee)}/mo)` : ""}.
        </p>
        {row.pending_change_message && <p className="mt-1 text-sm italic">“{row.pending_change_message}”</p>}
        <p className="mt-1 text-xs text-sky-800">{changeEffect(row.status)}</p>
      </div>
      {declining ? (
        <div className="space-y-2">
          <FormField id="decline-note" label="Why not?" hint="The client sees this.">
            <Input id="decline-note" autoFocus maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} className="bg-background" />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeclining(false)}>Cancel</Button>
            <Button variant="destructive" size="sm" disabled={decide.isPending} onClick={() => void answer("declined")}>Decline request</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <FormField id="approve-fee" label="Agreed monthly fee (₹)" hint="Before GST. Leave empty for the package's list price.">
            <Input id="approve-fee" inputMode="decimal" value={fee} placeholder={target ? String(target.monthly_fee) : ""} onChange={(e) => setFee(e.target.value)} className="bg-background" />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeclining(true)}>
              <X className="size-4" /> Decline
            </Button>
            <Button size="sm" disabled={decide.isPending} onClick={() => void answer("approved")}>
              <Check className="size-4" /> Approve
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

/** Staff move the engagement to another package directly (e.g. agreed on a call). Recorded as an approved change. */
export function ChangePackageDialog({ row, open, onOpenChange }: { row: Engagement; open: boolean; onOpenChange: (open: boolean) => void }) {
  const change = useChangePackage(row.id);
  const packages = usePackages();
  const [packageId, setPackageId] = useState("");
  const [fee, setFee] = useState("");
  const [note, setNote] = useState("");
  const options = packages.data?.filter((p) => p.is_active && p.id !== row.package_id) ?? [];
  const chosen = options.find((p) => String(p.id) === packageId);

  const close = () => {
    setPackageId("");
    setFee("");
    setNote("");
    onOpenChange(false);
  };

  async function submit() {
    const parsed = parseFee(fee);
    if (!chosen) {
      toast.error("Choose a package");
      return;
    }
    if (parsed === "invalid") {
      toast.error("Enter the fee as an amount with at most 2 decimals, or leave it empty for the list price");
      return;
    }
    try {
      await change.mutateAsync({ package_id: chosen.id, monthly_fee: parsed, note: note.trim() || null });
      toast.success(`Moved to ${chosen.name}`);
      close();
    } catch (err) {
      applyApiError(err);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change package</DialogTitle>
          <DialogDescription>
            {row.client_name} is on {row.package_name}. {changeEffect(row.status)}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <FormField id="change-package" label="New package">
            <Select value={packageId || undefined} onValueChange={setPackageId}>
              <SelectTrigger id="change-package" className="w-full"><SelectValue placeholder={packages.isLoading ? "Loading packages…" : "Select a package"} /></SelectTrigger>
              <SelectContent>
                {options.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name} · {formatINR(p.monthly_fee)}/mo</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField id="change-fee" label="Agreed monthly fee (₹)" hint="Before GST. Leave empty for the package's list price.">
            <Input id="change-fee" inputMode="decimal" value={fee} placeholder={chosen ? String(chosen.monthly_fee) : ""} onChange={(e) => setFee(e.target.value)} />
          </FormField>
          <FormField id="change-note" label="Note (optional)" hint="Recorded in the audit log.">
            <Textarea id="change-note" rows={2} maxLength={1000} value={note} placeholder="Client asked on the monthly call to add payroll." onChange={(e) => setNote(e.target.value)} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close}>Cancel</Button>
          <SubmitButton type="button" pending={change.isPending} onClick={() => void submit()}>Change package</SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
