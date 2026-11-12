import { api } from "@/lib/api-client";
import type { SessionUser } from "@/types/auth";
import type { ForgotPasswordValues, LoginValues, RegisterValues, SetPasswordValues } from "../schemas/auth.schema";

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
          gstin: values.gstin || null,
          pan: values.pan || null,
          state: values.state || null,
        },
      },
      noRefresh: true,
    }).then((r) => r.user),
  logout: () => api<void>("/auth/logout", { method: "POST", noRefresh: true }),
  forgotPassword: (values: ForgotPasswordValues) => api<MessageResponse>("/auth/forgot-password", { method: "POST", body: values, noRefresh: true }),
  resetPassword: (token: string, values: SetPasswordValues) =>
    api<MessageResponse>("/auth/reset-password", { method: "POST", body: { token, password: values.password }, noRefresh: true }),
  acceptInvite: (token: string, values: SetPasswordValues) =>
    api<MessageResponse>("/auth/accept-invite", { method: "POST", body: { token, password: values.password }, noRefresh: true }),
};
