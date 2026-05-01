import { generateResumeAndCoverLetter } from "../services/aiService.js";

/**
 * POST /generate controller.
 * Expects req.validatedInput to be set by validateGenerateInput middleware.
 */
export async function generateController(req, res, next) {
  try {
    const { resume, coverLetter } = await generateResumeAndCoverLetter(
      req.validatedInput
    );

    res.json({ resume, coverLetter });
  } catch (err) {
    next(err);
  }
}
