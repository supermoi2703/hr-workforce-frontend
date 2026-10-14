<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project: HRM & Workforce — frontend

Next.js (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui (on `@base-ui/react`) frontend for an
HRMS + Workforce management system. Backend: Spring Boot repo `hr-workforce-backend`.

## Commands

```bash
npm install       # install dependencies
npm run dev       # dev server at http://localhost:3000
npm run lint      # ESLint
npm run build     # production build (also type-checks)
```

## Docs (Vietnamese) — read before writing code

- `docs/01-quy-uoc-du-an-va-cau-truc-file.md` — conventions and folder structure (frontend: §3).
- `docs/02-quy-trinh-git.md` — branches `<github>/<type>/<short-desc>`, Conventional Commits, PR flow.
- `docs/03-quy-trinh-su-dung-ai-agent.md` — rules for AI-generated code.
- Overview (`00`) and task assignment (`04`: module owners, shared-code owners, open decisions) live
  in the backend repo — see `docs/README.md`.

## Key rules

- Feature code goes in `src/features/<domain>/` (components, hooks, `api.ts`, `types.ts`); routes in
  `src/app/`. A feature must not import from another feature — promote shared code to
  `src/components/shared/` or `src/lib/`.
- `src/components/ui/` is shadcn/ui; `src/components/shared/` and `src/lib/` are shared code with an
  owner (`docs/04` §4.1 in the backend repo). Don't change an existing shared prop/interface without
  updating every caller in the same PR; prefer adding an optional prop.
- Call the backend via relative `/api/...` through the shared HTTP client (never raw `fetch` in
  features). Responses are wrapped in `ApiResponse<T>` (`success`, `code`, `message`, `data`,
  `errors[{field, message}]`); paged data is `PageResponse<T>` (page index starts at 0).
- Get the current user only through the shared auth hook (`useCurrentUser`), never by reading tokens.
- Handle loading, error and empty states, and hide/guard UI by role/permission.
- Use theme tokens (CSS variables in `globals.css`) and shared components — no hard-coded colors or
  sizes in feature screens.
- Never commit `.env.local`; add every new env var to `.env.example` in the same PR.
