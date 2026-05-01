import { html } from "../lib/html.js";

const SECTION_HEADINGS = [
  "PROFESSIONAL SUMMARY",
  "WORK EXPERIENCE",
  "EDUCATION",
  "SKILLS",
];

function parseResumeSections(text) {
  const lines = text.split(/\r?\n/);
  const sections = [];
  let current = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (SECTION_HEADINGS.includes(trimmed)) {
      if (current) sections.push(current);
      current = { heading: trimmed, lines: [] };
      continue;
    }
    if (current) current.lines.push(line);
  }

  if (current) sections.push(current);
  return sections;
}

function renderParagraphBlock(text) {
  return text
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map(
      (paragraph, idx) => html`<p key=${`p-${idx}`} className="mb-4 last:mb-0">${paragraph}</p>`
    );
}

function ResumeDocument({ name, jobTitle, resume }) {
  const sections = parseResumeSections(resume);

  if (!sections.length) {
    return html`<pre className="whitespace-pre-wrap text-sm leading-6 text-slate-800">${resume}</pre>`;
  }

  return html`
    <article className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <header className="border-b border-slate-200 pb-4">
        <h3 className="font-display text-3xl font-semibold tracking-tight text-slate-900">${(name || "Candidate").toUpperCase()}</h3>
        <p className="mt-1 text-sm font-medium uppercase tracking-wide text-slate-600">${jobTitle || "Professional Candidate"}</p>
      </header>

      <div className="mt-6 space-y-5">
        ${sections.map(
          (section) => html`
            <section key=${section.heading}>
              <h4 className="border-b border-slate-200 pb-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-600">${section.heading}</h4>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-6 text-slate-800">${section.lines.join("\n").trim()}</pre>
            </section>
          `
        )}
      </div>
    </article>
  `;
}

function CoverLetterDocument({ coverLetter }) {
  return html`
    <article className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h3 className="font-display text-2xl font-semibold tracking-tight text-slate-900">Cover Letter</h3>
      <div className="mt-5 text-[15px] leading-7 text-slate-800">${renderParagraphBlock(coverLetter)}</div>
    </article>
  `;
}

export function ResultView({ result, profile, printableRef, onEdit, onDownload, downloading }) {
  if (!result) return null;

  return html`
    <section className="mx-auto w-full max-w-5xl space-y-5">
      <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-2xl font-semibold text-slate-900">Your Documents Are Ready</h2>
          <p className="text-sm text-slate-600">Review your drafts, then export as a polished PDF.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button
            type="button"
            onClick=${onEdit}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Edit Inputs
          </button>
          <button
            type="button"
            onClick=${onDownload}
            disabled=${downloading}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            ${downloading ? "Preparing PDF..." : "Download as PDF"}
          </button>
        </div>
      </div>

      <div ref=${printableRef} className="space-y-4">
        <${ResumeDocument} name=${profile.name} jobTitle=${profile.jobTitle} resume=${result.resume} />
        <${CoverLetterDocument} coverLetter=${result.coverLetter} />
      </div>
    </section>
  `;
}
