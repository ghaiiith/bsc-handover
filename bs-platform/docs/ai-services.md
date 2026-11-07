# AI services used by the platform

Report BS-39 asks for the matching endpoint, its authentication and its
request/response format to be documented in the repository so the integration is
not tied to one developer. This file covers both external AI services.

Everything is called **server-side only**. No AI base URL or key is ever exposed
to the browser (none of these variables are `NEXT_PUBLIC_*`).

| Service | Env var | Client module |
| --- | --- | --- |
| CV Builder (parse, generate, edit, rank) | `CV_BUILDER_API_URL` | `src/lib/cv/cv-builder-server.ts` |
| TrainerStudio (course authoring) | `TRAINER_STUDIO_API_URL` | `src/lib/instructor/ai/trainer-studio-server.ts` |

Both are optional: `isCvBuilderConfigured()` / `isTrainerStudioConfigured()`
return `false` when the variable is unset, and every caller degrades instead of
failing (candidate ranking falls back to skills overlap, course generation falls
back to a local template).

---

## 1. CV Builder

Base URL example: `https://cvbuilder-production-2e7a.up.railway.app`
Interactive reference: `GET {base}/docs` · machine-readable: `GET {base}/openapi.yaml`

**Authentication.** The deployment we use is reachable without a client
credential; the service holds its own `OPENROUTER_API_KEY` server-side. The
platform therefore sends no `Authorization` header. If the provider later
enables per-client keys, add the header in the single place that performs the
request — `fetchCvBuilderJson()` in `src/lib/cv/cv-builder-server.ts` — and put
the secret in a non-`NEXT_PUBLIC_` env var.

**Timeouts.** 30 s default, 60 s for generate/parse, 45 s for `/rank`. Every
call returns `{ ok: false, status, message }` rather than throwing.

### `POST /rank` — the matching endpoint (report BS-39)

Ranks candidates against a job description by embedding cosine similarity.

Request:

```jsonc
{
  "job_description": "Frontend Engineer with React, TypeScript, REST APIs.",
  "candidates": [
    // Either a structured resume (embedded on the fly)…
    { "id": "cv:9f2…", "resume": { "basics": { "name": "Jane Smith" }, "skills": [ … ] } },
    // …or a cached embedding from /parse (cheaper, no model call)
    { "id": "cand:41c…", "embedding": [0.013, -0.21, 0.07] }
  ],
  "embedding_model": "qwen/qwen3-embedding-8b" // optional; must match cached embeddings
}
```

Response:

```jsonc
{
  "ok": true,
  "count": 2,
  "embedding_model": "qwen/qwen3-embedding-8b",
  "ranked": [
    {
      "rank": 1,
      "id": "cv:9f2…",              // echoed back — this is how we map to our rows
      "name": "Jane Smith",
      "score": 71,                   // 0–100, what we show as the match score
      "similarity": 0.7123,
      "matched_keywords": ["react", "typescript"],   // the "why"
      "missing_keywords": ["graphql"],
      "keyword_coverage": 67          // null when only an embedding was supplied
    }
  ]
}
```

How the platform uses it:

- `rankCandidatesWithJob()` in `src/lib/cv/cv-builder-server.ts` normalises the
  response (the service has used `ranked` / `results` / `candidates` and
  `matched_keywords` / `matched_skills` across versions — all are accepted).
- `src/lib/candidates/recommend-for-job.ts` builds the pool, calls the endpoint,
  caches the result for 15 minutes per job, and falls back to skills overlap
  when the call fails.
- **`id` is our own composite key**: `cv:<cv_profiles.id>` for a CV built on the
  platform, `cand:<candidates.id>` for a CV imported in bulk. Keep the prefix —
  it is how a ranked row is mapped back to a person.

### Other CV Builder endpoints in use

| Endpoint | Used by | Purpose |
| --- | --- | --- |
| `POST /parse` | `parseCvFile`, `parseCvText` | Read an uploaded CV into a structured profile (bulk import, report BS-40). Pass `embed: false` to skip the embedding. |
| `POST /extract` | `extractCvText` | Plain text out of a CV file. |
| `POST /generate` | `generateCvPdf` | Structured resume → PDF. |
| `POST /edit` | `editResumeWithCvBuilder` | Natural-language edit of a resume (CV chatbot, report BS-33). |

---

## 2. TrainerStudio

Base URL example: `https://trainerstudio-production.up.railway.app`
Reference: `GET {base}/docs/full` · `GET {base}/openapi.yaml`

**Authentication.** Same model as CV Builder — no client credential; the service
holds its own key. Add any future header in `postTrainer()`.

| Endpoint | Used by | Purpose |
| --- | --- | --- |
| `POST /course/outline` | `generateCourseOutline` | Idea → syllabus. Called twice (ar + en) for a bilingual course. |
| `POST /lesson/content` | `generateLessonContent` | Lesson → script + written material. Feeds the trainer notes box (reports BS-30/BS-31). |
| `POST /lesson/slides` | `generateLessonSlides` | Lesson → deck spec (JSON). |
| `POST /pptx` | `renderDeckToPptx` | Deck spec → a real `.pptx`. Send `format: "base64"` to get JSON back instead of a binary body. |
| `POST /lesson/quiz` | `generateLessonQuiz` | Lesson → quiz. |
| `POST /trainer/bio` | `generateTrainerBio` | Raw trainer info → polished bio. |

Not yet wired: `/course/full`, `/lesson/reading`, `/project`, `/cover`, `/refine`.

---

## Candidate pool (reports BS-39 / BS-40)

| Source | Table | Written by |
| --- | --- | --- |
| CVs built on the platform | `cv_profiles.resume_data` | The user, in the CV Builder |
| CVs imported from a folder | `candidates.resume` | Admin bulk import → `src/lib/candidates/import-candidate.ts` |

`candidates` rows are personal data: RLS allows admins only, and everything else
goes through the service role behind an application-level role check. Employers
never query the table directly — they see the ranked shortlist for their own job
and nothing else.

Duplicate handling on import: identical file (sha256) → `duplicate`; same email,
new file → the record is `updated`; otherwise `imported`. A file we cannot pull a
name or email out of is reported as `failed` with the reason.
