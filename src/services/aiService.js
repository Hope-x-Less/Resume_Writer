import "../config/env.js";
import { HttpError } from "../utils/httpError.js";
import { SYSTEM_PROMPT, buildUserPrompt } from "../utils/prompts.js";

/**
 * Reads the AI provider config from process.env on every call. Reading lazily
 * (instead of caching at module load) means a server restart with new env
 * variables is enough to pick up new credentials.
 *
 * Env vars:
 *   OPENAI_API_KEY  - API key (required)
 *   OPENAI_BASE_URL - Defaults to https://openrouter.ai/api/v1
 *   OPENAI_MODEL    - Defaults to deepseek-chat
 */
function readAiConfig() {
  const apiKey = (process.env.OPENAI_API_KEY || "").trim();
  const baseUrl = (process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1")
    .trim()
    .replace(/\/+$/, "");
  const model = (process.env.OPENAI_MODEL || "deepseek-chat").trim();
  const fallbackModels = (process.env.OPENAI_MODEL_FALLBACKS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return { apiKey, baseUrl, model, fallbackModels };
}

/**
 * Throws HttpError(503) with a clear, actionable message describing exactly
 * which env var is wrong. Catches the most common configuration mistakes,
 * including swapping the API key into OPENAI_MODEL.
 */
function validateAiConfig({ apiKey, baseUrl, model }) {
  if (!apiKey) {
    throw new HttpError(
      503,
      "AI provider not configured: OPENAI_API_KEY is missing. Add it as a project environment variable.",
    );
  }

  let parsedBaseUrl;
  try {
    parsedBaseUrl = new URL(baseUrl);
  } catch {
    throw new HttpError(
      503,
      "AI provider not configured: OPENAI_BASE_URL must be a valid http(s) URL.",
    );
  }

  if (parsedBaseUrl.protocol !== "http:" && parsedBaseUrl.protocol !== "https:") {
    throw new HttpError(
      503,
      "AI provider not configured: OPENAI_BASE_URL must use http or https.",
    );
  }

  if (/^sk-(?:proj|or-v1|svcacct|live|test)-/i.test(model)) {
    throw new HttpError(
      503,
      "AI provider misconfigured: OPENAI_MODEL looks like an API key. Set OPENAI_MODEL to a model id (for example 'openai/gpt-4o-mini' on OpenRouter) and put the key in OPENAI_API_KEY.",
    );
  }

  if (!model) {
    throw new HttpError(
      503,
      "AI provider not configured: OPENAI_MODEL is missing. Set it to a valid model id such as 'deepseek-chat' or 'deepseek/deepseek-chat'.",
    );
  }
}

/**
 * Logs a one-time startup summary of the AI provider configuration. Never logs
 * the full key - only its presence, prefix, and length.
 */
let configLogged = false;
export function logAiConfigOnce() {
  if (configLogged) return;
  configLogged = true;

  const { apiKey, baseUrl, model } = readAiConfig();
  const rawModel = process.env.OPENAI_MODEL || "";
  const rawFallbackModels = process.env.OPENAI_MODEL_FALLBACKS || "";
  const apiKeyStatus = apiKey ? `loaded (${apiKey.length} chars)` : "missing";
  const baseUrlStatus = baseUrl ? `loaded (${baseUrl})` : "missing";
  const modelStatus = model ? `loaded (${model})` : "missing";
  const fallbackStatus = rawFallbackModels
    ? `loaded (${rawFallbackModels})`
    : "none";

  if (!apiKey) {
    console.warn(
      "[ai] WARNING: OPENAI_API_KEY is undefined - /generate will return 503 until it is set",
    );
  }
  if (/^sk-(?:proj|or-v1|svcacct|live|test)-/i.test(rawModel)) {
    console.warn(
      "[ai] WARNING: OPENAI_MODEL looks like an API key - /generate will return 503",
    );
  }
  const keyDisplay = apiKey
    ? `${apiKey.slice(0, 7)}... (${apiKey.length} chars)`
    : "MISSING";
  console.log(
    `[ai] env: OPENAI_API_KEY=${apiKeyStatus}; OPENAI_BASE_URL=${baseUrlStatus}; OPENAI_MODEL=${modelStatus}; OPENAI_MODEL_FALLBACKS=${fallbackStatus}`,
  );
  console.log(
    `[ai] config: baseUrl=${baseUrl} model=${model} key=${keyDisplay}`,
  );
}

/**
 * Calls an OpenAI-compatible chat-completions endpoint in JSON mode and
 * returns the raw assistant text content of the first choice.
 */
async function callChatCompletion({ system, user }) {
  const config = readAiConfig();
  validateAiConfig(config);

  const { apiKey, baseUrl, model, fallbackModels } = config;
  const MAX_ATTEMPTS = Number(process.env.AI_MAX_ATTEMPTS) || 3;
  const BASE_RETRY_DELAY_MS = Number(process.env.AI_RETRY_DELAY_MS) || 750;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function getRetryDelayMs(response, attempt) {
    const retryAfter = response.headers.get("retry-after");
    if (retryAfter) {
      const seconds = Number(retryAfter);
      if (Number.isFinite(seconds) && seconds > 0) {
        return Math.min(seconds * 1000, 10_000);
      }

      const retryDate = Date.parse(retryAfter);
      if (Number.isFinite(retryDate)) {
        return Math.min(Math.max(retryDate - Date.now(), 500), 10_000);
      }
    }

    return Math.min(BASE_RETRY_DELAY_MS * 2 ** (attempt - 1), 5_000);
  }

  function isRetryableStatus(status) {
    return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
  }

  function buildModelCandidates() {
    const defaults =
      model.includes(":free")
        ? ["deepseek/deepseek-chat", "deepseek-chat", "openai/gpt-4o-mini"]
        : ["deepseek/deepseek-chat", "deepseek-chat"];

    return [model, ...fallbackModels, ...defaults].filter(
      (value, index, values) => values.indexOf(value) === index,
    );
  }

  async function performChatCompletion({ includeResponseFormat, model: requestModel }) {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };

    // OpenRouter recommends (but does not require) these headers for analytics.
    if (/openrouter\.ai/i.test(baseUrl)) {
      headers["HTTP-Referer"] =
        process.env.OPENROUTER_REFERER?.trim() || "https://v0.app";
      headers["X-Title"] =
        process.env.OPENROUTER_APP_TITLE?.trim() || "Resume Generator";
    }

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      // Bound each upstream call so a slow provider can't hang the request forever.
      const REQUEST_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS) || 90_000;
      const controller = new AbortController();
      const abortTimer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      let response;
      try {
        response = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers,
          signal: controller.signal,
          body: JSON.stringify({
            model: requestModel,
            temperature: 0.7,
            max_tokens: 1800,
            ...(includeResponseFormat ? { response_format: { type: "json_object" } } : {}),
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
          }),
        });
      } catch (err) {
        if (err?.name === "AbortError") {
          throw new HttpError(
            504,
            `AI provider took longer than ${Math.round(REQUEST_TIMEOUT_MS / 1000)}s to respond. Please try again.`,
          );
        }

        if (attempt < MAX_ATTEMPTS) {
          const delayMs = getRetryDelayMs({ headers: new Headers() }, attempt);
          console.warn(
            `[ai] Network error on attempt ${attempt}/${MAX_ATTEMPTS}; retrying in ${delayMs}ms`,
          );
          await sleep(delayMs);
          continue;
        }

        throw new HttpError(502, "Failed to reach AI provider.", {
          cause: err?.message,
        });
      } finally {
        clearTimeout(abortTimer);
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        let providerMessage = errorText;
        try {
          const parsed = JSON.parse(errorText);
          providerMessage = parsed?.error?.message || providerMessage;
        } catch {
          /* not JSON - keep raw text */
        }

        if (response.status === 401 || response.status === 403) {
          throw new HttpError(
            503,
            `AI provider rejected the API key (HTTP ${response.status}): ${String(
              providerMessage,
            ).slice(0, 300)}`,
          );
        }

        const retryable = isRetryableStatus(response.status) && attempt < MAX_ATTEMPTS;
        if (retryable) {
          const delayMs = getRetryDelayMs(response, attempt);
          console.warn(
            `[ai] Provider returned HTTP ${response.status} on attempt ${attempt}/${MAX_ATTEMPTS}; retrying in ${delayMs}ms`,
          );
          await sleep(delayMs);
          continue;
        }

        throw new HttpError(502, "AI provider returned an error.", {
          status: response.status,
          providerMessage: String(providerMessage).slice(0, 500),
          responseFormatUsed: includeResponseFormat,
          model: requestModel,
        });
      }

      let data;
      try {
        data = await response.json();
      } catch {
        throw new HttpError(502, "AI provider returned an invalid JSON response.");
      }

      const text = data?.choices?.[0]?.message?.content;
      if (typeof text !== "string" || text.trim().length === 0) {
        throw new HttpError(502, "AI provider returned an empty response.");
      }

      return text.trim();
    }

    throw new HttpError(502, "AI provider returned an error after retries.", {
      model: requestModel,
    });
  }

  const modelCandidates = buildModelCandidates();
  for (const requestModel of modelCandidates) {
    try {
      return await performChatCompletion({ includeResponseFormat: true, model: requestModel });
    } catch (err) {
      const providerMessage = String(err?.details?.providerMessage || err?.message || "");
      const status = err?.details?.status;
      const looksLikeJsonModeMismatch =
        status === 400 &&
        /response_format|json_object|json mode|unsupported|invalid parameter|schema/i.test(
          providerMessage,
        );
      const looksLikeModelSelectionIssue =
        status === 400 &&
        /ambiguous|multiple models|model id|invalid model|unknown model|not found|does not exist/i.test(
          providerMessage,
        );

      if (looksLikeJsonModeMismatch) {
        try {
          return await performChatCompletion({
            includeResponseFormat: false,
            model: requestModel,
          });
        } catch (fallbackErr) {
          err = fallbackErr;
        }
      }

      const shouldFallbackModel =
        (isRetryableStatus(status) || looksLikeModelSelectionIssue) &&
        requestModel !== modelCandidates[modelCandidates.length - 1];

      if (shouldFallbackModel) {
        console.warn(
          `[ai] Model ${requestModel} failed with HTTP ${status}; trying fallback model ${modelCandidates[modelCandidates.indexOf(requestModel) + 1]}`,
        );
        continue;
      }

      throw err;
    }
  }
}

/**
 * Strips any accidental markdown fences and parses the model output as JSON.
 * Throws an HttpError(502) if the shape does not match { resume, coverLetter }.
 */
function parseResumeJson(rawText) {
  const cleaned = rawText
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
      } catch {
        throw new HttpError(502, "AI returned malformed JSON.", {
          preview: cleaned.slice(0, 300),
        });
      }
    } else {
      throw new HttpError(502, "AI returned malformed JSON.", {
        preview: cleaned.slice(0, 300),
      });
    }
  }

  const resume = parsed?.resume;
  const coverLetter = parsed?.coverLetter;

  if (
    typeof resume !== "string" ||
    resume.trim().length === 0 ||
    typeof coverLetter !== "string" ||
    coverLetter.trim().length === 0
  ) {
    throw new HttpError(
      502,
      "AI response did not include both resume and coverLetter fields.",
    );
  }

  return { resume: resume.trim(), coverLetter: coverLetter.trim() };
}

/**
 * Generates a resume and cover letter in a single AI call using the
 * comprehensive prompt template in utils/prompts.js.
 */
export async function generateResumeAndCoverLetter(input) {
  logAiConfigOnce();
  const rawText = await callChatCompletion({
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(input),
  });
  return parseResumeJson(rawText);
}
