# GitHub Issues Blog Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a Vite + React blog that publishes GitHub issues labeled `Published` to GitHub Pages.

**Architecture:** The static React app fetches GitHub issues from the public GitHub REST API at runtime. React Router serves home, post detail, and 404 routes from live API data. GitHub Actions builds and deploys the Vite output to GitHub Pages without syncing issue content during build.

**Tech Stack:** Vite 8, React 19, React Router 7, TypeScript, Vitest, React Markdown, remark-gfm, lucide-react, GitHub Actions Pages deployment.

---

### Task 1: Blog Data Normalization

**Files:**
- Create: `src/blog/types.ts`
- Create: `src/blog/normalize.ts`
- Create: `src/blog/__tests__/normalize.test.ts`

**Steps:**
1. Write failing Vitest coverage for slug creation, `Published` label filtering, excerpt cleanup, cover extraction, and reading time.
2. Run `npm test -- src/blog/__tests__/normalize.test.ts` and verify it fails because implementation is missing.
3. Implement the normalization helpers.
4. Run the same test and verify it passes.

### Task 2: Runtime GitHub Issues API

**Files:**
- Create: `src/blog/github.ts`
- Create: `src/blog/__tests__/github.test.ts`
- Modify: `src/App.tsx`

**Steps:**
1. Write failing tests for `wangkailang/blog` issues list and issue detail API URLs.
2. Implement a browser-safe GitHub API client that reads `Published` issues at runtime.
3. Update the home page to load the issues list and the article page to load issue details by issue number.
4. Remove build-time issue sync scripts and generated JSON.

### Task 3: React Routes and UI

**Files:**
- Modify: `src/main.tsx`
- Replace: `src/App.tsx`
- Replace: `src/index.css`
- Delete: `src/App.css`

**Steps:**
1. Implement BrowserRouter with `import.meta.env.BASE_URL` basename.
2. Build home, article, empty, and not found views.
3. Add dark theme state, system-theme initialization, and accessible theme toggle.
4. Render article bodies with `react-markdown` and `remark-gfm`.
5. Run lint and tests.

### Task 4: GitHub Pages Deployment

**Files:**
- Modify: `vite.config.ts`
- Create: `.github/workflows/deploy.yml`
- Create: `scripts/write-spa-fallback.mjs`
- Modify: `README.md`

**Steps:**
1. Configure Vite base path for GitHub Pages project sites.
2. Copy `dist/index.html` to `dist/404.html` after build for clean React Router refreshes.
3. Add a Pages workflow triggered by `push` and `workflow_dispatch`.
4. Document labels, runtime GitHub API loading, local development, and deployment.

### Task 5: Verification

**Commands:**
- `npm test -- --run`
- `npm run lint`
- `npm run build`
- `npm run preview -- --host 127.0.0.1`

**Steps:**
1. Run all verification commands fresh.
2. Open the preview in the browser and check desktop and mobile.
3. Fix any functional, visual, or responsive issues before handoff.
