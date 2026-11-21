/**
 * JournL integration switch (connection codes, JournL Books, corrections, JournL access and permissions).
 * Off by default: accountants sign in to JournL directly with their own login, and Accountanz only shows
 * "Open in JournL". Keep it in step with the backend's JOURNL_INTEGRATION_ENABLED.
 * NEXT_PUBLIC_ values are read at build time, so restart `next dev` (or rebuild) after changing it.
 */
export const JOURNL_INTEGRATION = process.env.NEXT_PUBLIC_JOURNL_INTEGRATION === "true";

/** Menu links that belong to the JournL integration; hidden while it's off. */
export const JOURNL_INTEGRATION_HREFS = ["/admin/journl-access", "/admin/integrations", "/team/journl"];
