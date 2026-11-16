import { api } from "@/lib/api-client";
import type { SessionUser } from "@/types/auth";
import type { ForgotPasswordValues, LoginValues, RegisterAccountantValues, RegisterValues, SetPasswordValues } from "../schemas/auth.schema";

type UserResponse = { user: SessionUser };
type MessageResponse = { message: string };

export const authService = {
  me: () => api<UserResponse>("/auth/me").then((r) => r.user),
  login: (values: LoginValues) => api<UserResponse>("/auth/login", { method: "POST", body: values, noRefresh: true }).then((r) => r.user),
  register: (values: RegisterValues) =>
    api<UserResponse>("/auth/register", {
      method: "POST",
      body: {
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        company: {
          legal_name: values.legal_name,
          trade_name: values.trade_name || null,
          business_type: values.business_type || null,
          date_of_establishment: values.date_of_establishment || null,
          gstin: values.gstin || null,
          pan: values.pan || null,
          state: values.state || null,
          address: values.address || null,
          primary_contact_name: values.primary_contact_name || null,
          primary_contact_email: values.primary_contact_email || null,
          primary_contact_phone: values.primary_contact_phone || null,
          accounting_software: values.accounting_software || "none",
        },
      },
      noRefresh: true,
    }).then((r) => r.user),
  registerAccountant: (values: RegisterAccountantValues) =>
    api<MessageResponse>("/auth/register-accountant", {
      method: "POST",
      body: {
        fullName: values.fullName,
        email: values.email,
        phone: values.phone || undefined,
        password: values.password,
        portal_role: values.portal_role,
      },
      noRefresh: true,
    }),
  logout: () => api<void>("/auth/logout", { method: "POST", noRefresh: true }),
  forgotPassword: (values: ForgotPasswordValues) => api<MessageResponse>("/auth/forgot-password", { method: "POST", body: values, noRefresh: true }),
  resetPassword: (token: string, values: SetPasswordValues) =>
    api<MessageResponse>("/auth/reset-password", { method: "POST", body: { token, password: values.password }, noRefresh: true }),
  acceptInvite: (token: string, values: SetPasswordValues) =>
    api<MessageResponse>("/auth/accept-invite", { method: "POST", body: { token, password: values.password }, noRefresh: true }),
};
