import { html } from "../lib/html.js";

const FIELD_BASE =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200";

function InputField({ label, name, value, onChange, required = false, type = "text", placeholder = "" }) {
  return html`
    <label className="block text-sm font-medium text-slate-700">
      ${label}${required ? html`<span className="text-emerald-700"> *</span>` : null}
      <input
        className=${FIELD_BASE}
        name=${name}
        value=${value}
        onChange=${onChange}
        type=${type}
        placeholder=${placeholder}
        required=${required}
      />
    </label>
  `;
}

function TextareaField({ label, name, value, onChange, required = false, placeholder = "", rows = 4 }) {
  return html`
    <label className="block text-sm font-medium text-slate-700">
      ${label}${required ? html`<span className="text-emerald-700"> *</span>` : null}
      <textarea
        className=${FIELD_BASE}
        name=${name}
        value=${value}
        onChange=${onChange}
        rows=${rows}
        placeholder=${placeholder}
        required=${required}
      />
    </label>
  `;
}

export function ResumeForm({ values, onChange, onSubmit, loading, error }) {
  return html`
    <section className="mx-auto w-full max-w-4xl rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-xl backdrop-blur sm:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-900">Build Your Documents</h2>
          <p className="mt-1 text-sm text-slate-600">Fill in your details to generate an ATS-friendly resume and tailored cover letter.</p>
        </div>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-800">DeepSeek</span>
      </div>

      <form className="space-y-6" onSubmit=${onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <${InputField}
            label="Full Name"
            name="name"
            value=${values.name}
            onChange=${onChange}
            required=${true}
            placeholder="Ayesha Patel"
          />
          <${InputField}
            label="Age"
            name="age"
            value=${values.age}
            onChange=${onChange}
            type="number"
            placeholder="27"
          />
        </div>

        <${TextareaField}
          label="Education"
          name="education"
          value=${values.education}
          onChange=${onChange}
          required=${true}
          rows=${3}
          placeholder="B.Sc. Computer Science, University of Delhi, 2021"
        />

        <${TextareaField}
          label="Experience"
          name="experience"
          value=${values.experience}
          onChange=${onChange}
          required=${true}
          rows=${5}
          placeholder="Share roles, responsibilities, outcomes, and timelines."
        />

        <${TextareaField}
          label="Skills"
          name="skills"
          value=${values.skills}
          onChange=${onChange}
          required=${true}
          rows=${3}
          placeholder="React, Node.js, SQL, Agile, stakeholder communication"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <${InputField}
            label="Job Title"
            name="jobTitle"
            value=${values.jobTitle}
            onChange=${onChange}
            required=${true}
            placeholder="Frontend Developer"
          />
          <${InputField}
            label="Company Name"
            name="companyName"
            value=${values.companyName}
            onChange=${onChange}
            placeholder="Stripe"
          />
        </div>

        <${TextareaField}
          label="Job Description"
          name="jobDescription"
          value=${values.jobDescription}
          onChange=${onChange}
          rows=${5}
          placeholder="Paste the role requirements so output is more tailored."
        />

        <${TextareaField}
          label="Additional Notes"
          name="additionalNotes"
          value=${values.additionalNotes}
          onChange=${onChange}
          rows=${3}
          placeholder="Context to highlight: career switch, domain knowledge, side projects, etc."
        />

        ${error
          ? html`<div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">${error}</div>`
          : null}

        <button
          type="submit"
          disabled=${loading}
          className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          ${loading
            ? html`<span className="inline-flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white"></span>Generating...</span>`
            : "Generate Resume & Cover Letter"}
        </button>
      </form>
    </section>
  `;
}
