# AI Resume & Cover Letter Generator

Professional, minimal full-stack app that generates ATS-friendly resumes and tailored cover letters using a configurable OpenAI-compatible provider.

## Features

- Generate structured resume text and customized cover letters from user-provided fields
- Clean validation with helpful 400 errors for missing fields
- Frontend UI to edit inputs and preview results, plus PDF export
- Lightweight Express backend exposing `POST /generate`
- Pluggable AI provider via `OPENAI_BASE_URL` + `OPENAI_MODEL`

## Tech stack

- Node.js + Express — backend API
- Plain React (frontend under `public/`) — user interface and client API
- HTM helper in `lib/` for lightweight templating
- No build step required to run locally (dev run uses `npm run dev`)

## Repository layout (important folders)

- `src/` — backend source and server entrypoints
  - `server.js` — HTTP server bootstrap
  - `app.js` — express app (middleware + routes)
  - `routes/` — route definitions (e.g., `generate.js`)
  - `controllers/` — request handlers (e.g., `generateController.js`)
  - `middleware/` — request validation and centralized error handlers
  - `services/` — provider integrations (e.g., `aiService.js`)
  - `utils/` — helpers and prompt builders (`prompts.js`, `httpError.js`)
- `public/` — frontend app, client-side API and components
  - `app.js` — frontend entry & state
  - `index.html` — single-page app shell
  - `api/` — client API (`generateApi.js`)
  - `components/` — UI pieces (`ResumeForm.js`, `ResultView.js`)
- `lib/` — small helpers (e.g., `html.js`)
- `scripts/` — convenience scripts (e.g., `test_generate.js`)

> Note: I did not move or rename files to avoid breaking imports or runtime behavior.

## Installation

1. Install dependencies:

```bash
npm install
```

2. Create env file from example and set secrets:

```powershell
Copy-Item .env.example .env
# edit .env and set OPENAI_API_KEY and any other variables
```

3. Run in development (watch):

```bash
npm run dev
```

Or run production:

```bash
npm start
```

The server listens on `http://localhost:3000` by default (see `PORT`).

## Environment variables

Set the following in your `.env` file or environment:

- `PORT` — HTTP port (default `3000`)
- `CORS_ORIGIN` — allowed origins (default `*`)
- `OPENAI_API_KEY` — API key for upstream provider (required)
- `OPENAI_BASE_URL` — base URL for chat-compatible provider
- `OPENAI_MODEL` — model id to use

The server performs graceful checks and will return a 503/clear error if required provider config is missing.

## API

### `POST /generate`

Request body (JSON): required fields are `name`, `education`, `experience`, `skills`, `jobTitle`.

Example request body:

```json
{
  "name": "Jane Doe",
  "education": "B.S. Computer Science",
  "experience": "3 years frontend",
  "skills": "React, TypeScript",
  "jobTitle": "Senior Frontend Engineer"
}
```

Successful response (`200`) returns JSON with `resume` and `coverLetter` text fields.

Validation errors return `400` with a `details` object listing missing fields.

## Usage (quick)

- Open the app in a browser at `http://localhost:3000` (if the frontend is served statically by the server)
- Fill the form and click the generate/download actions

## Suggested improvements (non-breaking, optional)

- Add a lightweight `frontend/` build step and package.json `client` scripts if you later adopt a bundler.
- Add unit tests for `controllers/generateController.js` and `services/aiService.js` (helps CI).
- Add an `examples/` folder with sample request bodies for integration testing.

## Contributing

1. Fork the repo
2. Create a feature branch
3. Open a PR with a clear description

## License

Add a `LICENSE` file if you intend to open-source this repository.

---
If you'd like, I can also add a recommended `.github/workflows/ci.yml` to run lint/tests and a `CONTRIBUTING.md` template.
