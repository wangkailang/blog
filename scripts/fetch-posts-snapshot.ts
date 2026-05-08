import { writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { normalizeIssues } from '../src/blog/normalize'
import type { GitHubIssue } from '../src/blog/types'

const OWNER = process.env.BLOG_REPOSITORY_OWNER ?? 'wangkailang'
const REPO = process.env.BLOG_REPOSITORY_NAME ?? 'blog'
const LABEL = process.env.BLOG_PUBLISH_LABEL ?? 'Published'
const OUTPUT_PATH = resolve('public/posts.json')
const PER_PAGE = 100

const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? ''
const headers: Record<string, string> = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
}
if (token) {
  headers.Authorization = `Bearer ${token}`
}

async function fetchIssuesPage(page: number): Promise<GitHubIssue[]> {
  const url = new URL(`https://api.github.com/repos/${OWNER}/${REPO}/issues`)
  url.searchParams.set('state', 'open')
  url.searchParams.set('labels', LABEL)
  url.searchParams.set('per_page', String(PER_PAGE))
  url.searchParams.set('page', String(page))

  const response = await fetch(url, { headers })
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`GitHub API ${response.status} ${response.statusText}: ${body.slice(0, 200)}`)
  }

  return (await response.json()) as GitHubIssue[]
}

async function fetchAllIssues(): Promise<GitHubIssue[]> {
  const collected: GitHubIssue[] = []
  for (let page = 1; ; page += 1) {
    const batch = await fetchIssuesPage(page)
    collected.push(...batch.filter((issue) => !issue.pull_request))
    if (batch.length < PER_PAGE) break
  }
  return collected
}

async function main() {
  const issues = await fetchAllIssues()
  const posts = normalizeIssues(issues, LABEL)
  const snapshot = {
    generatedAt: new Date().toISOString(),
    repository: `${OWNER}/${REPO}`,
    label: LABEL,
    posts,
  }

  await mkdir(resolve('public'), { recursive: true })
  await writeFile(OUTPUT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`)
  console.log(`[posts-snapshot] wrote ${posts.length} posts → ${OUTPUT_PATH}`)
}

main().catch((error) => {
  console.error('[posts-snapshot] failed:', error instanceof Error ? error.message : error)
  if (process.env.CI) {
    process.exitCode = 1
  } else {
    console.warn('[posts-snapshot] continuing without snapshot — runtime will fall back to GitHub API.')
  }
})
