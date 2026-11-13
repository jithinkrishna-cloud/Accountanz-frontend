"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ClientPicker } from "@/features/workspace/components/client-picker";
import { ApiError } from "@/lib/api-client";
import { applyApiError } from "@/lib/form-errors";
import type { StaffPortal } from "@/types/auth";
import { useCreateReport } from "../hooks/use-reports";
import { REPORT_LABELS, REPORT_TYPES, type ReportType } from "../types/report.types";

const lastMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
};

function ReportForm({ portal, clientId, onDone }: { portal: StaffPortal; clientId?: number; onDone: () => void }) {
  const create = useCreateReport(portal);
  const [client, setClient] = useState(clientId ? String(clientId) : "");
  const [type, setType] = useState<ReportType>("profit_and_loss");
  const [period, setPeriod] = useState(lastMonth());
  const [summary, setSummary] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!client) next.client = "Choose a client";
    if (!period) next.period = "Choose the period";
    if (!file && !summary.trim()) next.summary = "Attach the report file or write a summary";
    setErrors(next);
    if (Object.keys(next).length) return;
    try {
      await create.mutateAsync({ client_id: Number(client), period, report_type: type, summary: summary.trim(), file });
      toast.success("Draft saved. A reviewer can publish it to the client.");
      onDone();
    } catch (err) {
      const message = applyApiError(err);
      if (err instanceof ApiError && err.fieldErrors.summary) setErrors({ summary: message });
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>New report</DialogTitle>
        <DialogDescription>Saved as a draft. The client only sees it once a reviewer on the client, or an admin, publishes it.</DialogDescription>
      </DialogHeader>
      <form id="report-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        {!clientId && (
          <FormField id="rep-client" label="Client" error={errors.client} className="sm:col-span-2">
            <ClientPicker portal={portal} id="rep-client" value={client} onChange={setClient} invalid={!!errors.client} />
          </FormField>
        )}
        <FormField id="rep-type" label="Report">
          <Select value={type} onValueChange={(v) => setType(v as ReportType)}>
            <SelectTrigger id="rep-type" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{REPORT_TYPES.map((t) => <SelectItem key={t} value={t}>{REPORT_LABELS[t]}</SelectItem>)}</SelectContent>
          </Select>
        </FormField>
        <FormField id="rep-period" label="Period" error={errors.period}>
          <Input id="rep-period" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
        </FormField>
        <FormField id="rep-file" label="Report file" hint="PDF, Excel, Word or CSV, up to 20 MB. For example, exported from JournL." className="sm:col-span-2">
          <Input id="rep-file" type="file" accept=".pdf,.xls,.xlsx,.csv,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </FormField>
        <FormField id="rep-summary" label="Summary for the client" error={errors.summary} className="sm:col-span-2">
          <Textarea id="rep-summary" rows={4} maxLength={2000} placeholder="Revenue ₹18.4L, gross margin 31%, net profit ₹2.1L." value={summary} onChange={(e) => setSummary(e.target.value)} />
        </FormField>
      </form>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <SubmitButton form="report-form" pending={create.isPending}>Save draft</SubmitButton>
      </DialogFooter>
    </>
  );
}

export function NewReportDialog({ portal, clientId, open, onOpenChange }: { portal: StaffPortal; clientId?: number; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">{open && <ReportForm portal={portal} clientId={clientId} onDone={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
  );
}
