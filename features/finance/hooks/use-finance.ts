"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PaymentFormOutput } from "../schemas/finance.schema";
import { invoiceService, paymentService, payoutService } from "../services/finance-service";
import type { InvoiceStatus, PaymentMethod } from "../types/finance.types";

const INVOICES = ["admin", "invoices"] as const;
const PAYMENTS = ["admin", "payments"] as const;
const PAYOUTS = ["admin", "payouts"] as const;

/** Money changes ripple into invoices, payments and the dashboard. */
function useInvalidateMoney() {
  const qc = useQueryClient();
  return () => {
    for (const key of [INVOICES, PAYMENTS, ["admin", "dashboard"], ["admin", "analytics"], ["admin", "engagements"]]) void qc.invalidateQueries({ queryKey: key });
  };
}

export const useInvoices = (params: { q?: string; client_id?: string; status?: InvoiceStatus; page?: number }) =>
  useQuery({ queryKey: [...INVOICES, params], queryFn: () => invoiceService.list(params), placeholderData: keepPreviousData });

export function useCreateInvoice() {
  const onSuccess = useInvalidateMoney();
  return useMutation({ mutationFn: ({ engagementId, period }: { engagementId: number; period: string }) => invoiceService.create(engagementId, period), onSuccess });
}

export function useSetInvoiceStatus() {
  const onSettled = useInvalidateMoney();
  return useMutation({ mutationFn: ({ id, status }: { id: number; status: InvoiceStatus }) => invoiceService.setStatus(id, status), onSettled });
}

export const usePayments = (params: { q?: string; method?: PaymentMethod; page?: number }) =>
  useQuery({ queryKey: [...PAYMENTS, params], queryFn: () => paymentService.list(params), placeholderData: keepPreviousData });

export const useOpenInvoices = (enabled: boolean) => useQuery({ queryKey: [...PAYMENTS, "open-invoices"], queryFn: paymentService.openInvoices, enabled });

export function useRecordPayment() {
  const onSuccess = useInvalidateMoney();
  return useMutation({ mutationFn: (v: PaymentFormOutput) => paymentService.record(v), onSuccess });
}

export const usePayouts = (period: string) => useQuery({ queryKey: [...PAYOUTS, period], queryFn: () => payoutService.list(period) });

function useInvalidatePayouts() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: PAYOUTS });
}

export function useGeneratePayoutRun() {
  const onSuccess = useInvalidatePayouts();
  return useMutation({ mutationFn: payoutService.generate, onSuccess });
}

export function useApprovePayout() {
  const onSettled = useInvalidatePayouts();
  return useMutation({ mutationFn: payoutService.approve, onSettled });
}

export function useMarkPayoutPaid() {
  const onSettled = useInvalidatePayouts();
  return useMutation({ mutationFn: ({ id, reference }: { id: number; reference: string | null }) => payoutService.markPaid(id, reference), onSettled });
}
