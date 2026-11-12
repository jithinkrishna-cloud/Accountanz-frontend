import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { toast } from "sonner";
import { ApiError } from "./api-client";

/**
 * Maps a failed API call onto the form: server field errors appear under their fields,
 * anything else becomes a toast. Returns the message for callers that show it inline.
 */
export function applyApiError<T extends FieldValues>(err: unknown, setError?: UseFormSetError<T>, fields?: readonly string[]) {
  const apiErr = err instanceof ApiError ? err : null;
  let placed = false;
  if (apiErr && setError) {
    for (const [field, messages] of Object.entries(apiErr.fieldErrors)) {
      if (messages?.length && (!fields || fields.includes(field))) {
        setError(field as Path<T>, { message: messages[0] });
        placed = true;
      }
    }
  }
  const message = apiErr?.message ?? "Something went wrong. Please try again.";
  if (!placed) toast.error(message);
  return message;
}
