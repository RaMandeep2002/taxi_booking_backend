import { ZodError, ZodIssue } from "zod";

/**
 * Formats Zod validation errors into a structured array.
 * Each error contains the field and the corresponding message.
 * If the error object is not a ZodError, returns a generic error.
 */
export function formatZodErrors(error: unknown) {
  if (!(error instanceof ZodError)) {
    return [
      {
        field: "unknown",
        message: "Invalid input or unknown validation error.",
      },
    ];
  }

  // Filter out duplicate errors for the same field (optional, for clarity)
  const seenFields = new Set<string>();
  const formatted = error.errors
    .filter((err: ZodIssue) => {
      const field = err.path.join(".");
      if (seenFields.has(field)) return false;
      seenFields.add(field);
      return true;
    })
    .map((err: ZodIssue) => ({
      field: err.path.join("."),
      message: err.message,
    }));

  return formatted.length > 0
    ? formatted
    : [
        {
          field: "unknown",
          message: "Validation failed with no specific errors.",
        },
      ];
}