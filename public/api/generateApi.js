export async function generateDocuments(payload) {
  const response = await fetch("/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const providerMessage = data?.details?.providerMessage || data?.details?.cause;
    const status = data?.details?.status;
    const message =
      data?.error || data?.message || `Request failed with status ${response.status}.`;
    const alreadyIncludesStatus = /provider status \d+|HTTP \d+/i.test(message);
    const alreadyIncludesProviderMessage =
      providerMessage && message.includes(providerMessage);

    const withStatus =
      status && !alreadyIncludesStatus ? `${message} (provider status ${status})` : message;
    const suffix = providerMessage && !alreadyIncludesProviderMessage ? `: ${providerMessage}` : "";
    throw new Error(`${withStatus}${suffix}`.trim());
  }

  if (
    !data ||
    typeof data.resume !== "string" ||
    typeof data.coverLetter !== "string"
  ) {
    throw new Error("Server returned an unexpected response shape.");
  }

  return {
    resume: data.resume.trim(),
    coverLetter: data.coverLetter.trim(),
  };
}
