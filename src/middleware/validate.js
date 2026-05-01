import { HttpError } from "../utils/httpError.js";

const REQUIRED_FIELDS = ["name", "education", "experience", "skills", "jobTitle"];

const ALL_FIELDS = [
  "name",
  "age",
  "education",
  "experience",
  "skills",
  "jobTitle",
  "companyName",
  "jobDescription",
  "additionalNotes",
];

/**
 * Validates the body of POST /generate.
 * - Ensures the body is a JSON object.
 * - Ensures all required fields are present and non-empty strings.
 * - Coerces every known field to a trimmed string and stores the
 *   normalized object on req.validatedInput for the controller.
 */
export function validateGenerateInput(req, _res, next) {
  const body = req.body;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return next(new HttpError(400, "Request body must be a JSON object."));
  }

  const normalized = {};
  for (const key of ALL_FIELDS) {
    const value = body[key];
    normalized[key] = typeof value === "string" ? value.trim() : "";
  }

  // Backward compatibility for older clients that still send "notes".
  if (!normalized.additionalNotes && typeof body.notes === "string") {
    normalized.additionalNotes = body.notes.trim();
  }

  const missing = REQUIRED_FIELDS.filter((key) => normalized[key].length === 0);
  if (missing.length > 0) {
    return next(
      new HttpError(400, "Missing required fields.", {
        missingFields: missing,
        requiredFields: REQUIRED_FIELDS,
      })
    );
  }

  req.validatedInput = normalized;
  next();
}
