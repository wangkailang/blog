# GitHub Issues Blog Design

## Goal

Build a Vite + React blog that publishes GitHub issues labeled `Published` to GitHub Pages through GitHub Actions.

## Architecture

The app is a static React site. The browser fetches open GitHub issues from `wangkailang/blog` with the `Published` label through the GitHub REST API at runtime. GitHub Actions only builds and deploys the Vite `dist` artifact; issue content is not synchronized during build.

## User Experience

The first screen is the real blog, not a landing page. It uses an Apple-inspired editorial style: system typography, calm spacing, thin separators, glassy navigation, dark mode, subtle hover motion, and responsive reading layouts. The home page shows featured and recent posts; post pages render GitHub-flavored Markdown.

## Data Contract

Only issues with label `Published` are included. Each post includes issue number, title, slug, URL, author, labels, timestamps, excerpt, reading time, body, and optional cover image extracted from the first Markdown image in the issue body.

## Error Handling

The UI shows loading, empty, and error states for runtime GitHub API requests. A failed GitHub fetch should show a retry-friendly error instead of relying on stale generated content.

## Testing

Vitest covers issue normalization, slug generation, excerpt generation, reading-time calculation, cover extraction, runtime GitHub API URL construction, pagination, pull request filtering, and React rendering from live API responses. Build and lint verify the production bundle and source quality.
