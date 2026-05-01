import { React, html } from "./lib/html.js";
import { createRoot } from "https://esm.sh/react-dom@18.2.0/client";

import { generateDocuments } from "./api/generateApi.js";
import { ResumeForm } from "./components/ResumeForm.js";
import { ResultView } from "./components/ResultView.js";

const REQUIRED_FIELDS = ["name", "education", "experience", "skills", "jobTitle"];

const INITIAL_FORM = {
  name: "",
  age: "",
  education: "",
  experience: "",
  skills: "",
  jobTitle: "",
  companyName: "",
  jobDescription: "",
  additionalNotes: "",
};

function buildPayload(values) {
  const payload = { ...values };
  Object.keys(payload).forEach((key) => {
    if (typeof payload[key] === "string") payload[key] = payload[key].trim();
    if (payload[key] === "") delete payload[key];
  });
  return payload;
}

function validatePayload(payload) {
  const missing = REQUIRED_FIELDS.filter((field) => !payload[field]);
  if (!missing.length) return null;

  const labels = {
    name: "Name",
    education: "Education",
    experience: "Experience",
    skills: "Skills",
    jobTitle: "Job Title",
  };

  return `Please complete: ${missing.map((key) => labels[key]).join(", ")}.`;
}

async function exportElementToPdf(element, fileName) {
  const { jsPDF } = window.jspdf || {};
  if (!window.html2canvas || !jsPDF) {
    throw new Error("PDF libraries failed to load. Refresh and try again.");
  }

  const canvas = await window.html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#f8fafc",
  });

  const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 28;
  const imageWidth = pageWidth - margin * 2;
  const imageHeight = (canvas.height * imageWidth) / canvas.width;
  const imageData = canvas.toDataURL("image/png");

  let remaining = imageHeight;
  let offsetY = margin;

  pdf.addImage(imageData, "PNG", margin, offsetY, imageWidth, imageHeight, undefined, "FAST");
  remaining -= pageHeight - margin * 2;

  while (remaining > 0) {
    offsetY = margin - (imageHeight - remaining);
    pdf.addPage();
    pdf.addImage(imageData, "PNG", margin, offsetY, imageWidth, imageHeight, undefined, "FAST");
    remaining -= pageHeight - margin * 2;
  }

  pdf.save(fileName);
}

function App() {
  const [values, setValues] = React.useState(INITIAL_FORM);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [result, setResult] = React.useState(null);
  const [downloading, setDownloading] = React.useState(false);

  const printableRef = React.useRef(null);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const payload = buildPayload(values);
    const validationError = validatePayload(payload);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const data = await generateDocuments(payload);
      setResult(data);
      requestAnimationFrame(() => {
        document.getElementById("result-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (err) {
      setError(err?.message || "Failed to generate documents. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleEdit() {
    document.getElementById("form-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleDownload() {
    if (!printableRef.current) return;

    setDownloading(true);
    try {
      const baseName = (values.name || "resume").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const rolePart = (values.jobTitle || "cover-letter").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const fileName = `${baseName || "candidate"}-${rolePart || "documents"}.pdf`;
      await exportElementToPdf(printableRef.current, fileName);
    } catch (err) {
      setError(err?.message || "Unable to export PDF right now.");
    } finally {
      setDownloading(false);
    }
  }

  return html`
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#dcfce7_0%,#f8fafc_32%,#eef2ff_100%)] pb-16 pt-10 sm:pt-16">
      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <section className="mx-auto mb-8 max-w-3xl text-center">
          <p className="inline-block rounded-full border border-emerald-200 bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
            AI Resume Suite
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Build a Better Resume in Minutes
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-7 text-slate-600">
            Generate a polished ATS-friendly resume and a tailored cover letter using DeepSeek via OpenRouter.
          </p>
        </section>

        <div id="form-anchor"></div>
        <${ResumeForm}
          values=${values}
          onChange=${handleChange}
          onSubmit=${handleSubmit}
          loading=${loading}
          error=${error}
        />

        <div id="result-anchor" className="pt-8">
          <${ResultView}
            result=${result}
            profile=${values}
            printableRef=${printableRef}
            onEdit=${handleEdit}
            onDownload=${handleDownload}
            downloading=${downloading}
          />
        </div>
      </main>
    </div>
  `;
}

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(html`<${App} />`);
}
