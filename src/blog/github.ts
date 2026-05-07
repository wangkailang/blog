import { isPublishedIssue, normalizeIssue, normalizeIssues } from './normalize'
import type { BlogPost, GitHubIssue } from './types'

export const BLOG_REPOSITORY_OWNER = 'wangkailang'
export const BLOG_REPOSITORY_NAME = 'blog'
export const BLOG_PUBLISH_LABEL = 'Published'
export const BLOG_REPOSITORY = `${BLOG_REPOSITORY_OWNER}/${BLOG_REPOSITORY_NAME}`

type Fetcher = typeof fetch

type GitHubFetchOptions = {
  fetcher?: Fetcher
}

const githubHeaders = {
  Accept: 'application/vnd.github+json',
}

function createGitHubUrl(path: string, params?: Record<string, string | number>) {
  const url = new URL(`https://api.github.com/repos/${BLOG_REPOSITORY}${path}`)

  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, String(value))
  }

  return url.toString()
}

async function fetchJson(url: string, fetcher: Fetcher): Promise<unknown> {
  const response = await fetcher(url, { headers: githubHeaders })

  if (!response.ok) {
    throw new Error(`GitHub API request failed: ${response.status}`)
  }

  return response.json()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isGitHubIssueLabel(value: unknown): boolean {
  return typeof value === 'string' || (isRecord(value) && typeof value.name === 'string')
}

function isGitHubIssue(value: unknown): value is GitHubIssue {
  if (!isRecord(value)) {
    return false
  }

  const user = value.user

  return (
    typeof value.number === 'number' &&
    typeof value.title === 'string' &&
    (typeof value.body === 'string' || value.body === null) &&
    typeof value.html_url === 'string' &&
    typeof value.created_at === 'string' &&
    typeof value.updated_at === 'string' &&
    Array.isArray(value.labels) &&
    value.labels.every(isGitHubIssueLabel) &&
    (user === null ||
      (isRecord(user) &&
        typeof user.login === 'string' &&
        typeof user.avatar_url === 'string' &&
        typeof user.html_url === 'string'))
  )
}

function parseGitHubIssues(value: unknown): GitHubIssue[] {
  if (!Array.isArray(value) || !value.every(isGitHubIssue)) {
    throw new Error('Unexpected GitHub issues response')
  }

  return value
}

function parseGitHubIssue(value: unknown): GitHubIssue {
  if (!isGitHubIssue(value)) {
    throw new Error('Unexpected GitHub issue response')
  }

  return value
}

export async function fetchPublishedPosts({
  fetcher = fetch,
}: GitHubFetchOptions = {}): Promise<BlogPost[]> {
  const issues: GitHubIssue[] = []

  for (let page = 1; ; page += 1) {
    const pageIssues = parseGitHubIssues(
      await fetchJson(
        createGitHubUrl('/issues', {
          state: 'open',
          labels: BLOG_PUBLISH_LABEL,
          per_page: 100,
          page,
        }),
        fetcher,
      ),
    )

    issues.push(...pageIssues)

    if (pageIssues.length < 100) {
      break
    }
  }

  const issueOnlyItems = issues.filter((issue) => !issue.pull_request)

  return normalizeIssues(issueOnlyItems, BLOG_PUBLISH_LABEL)
}

export async function fetchIssuePost(
  issueNumber: number,
  { fetcher = fetch }: GitHubFetchOptions = {},
): Promise<BlogPost | undefined> {
  const issue = parseGitHubIssue(
    await fetchJson(createGitHubUrl(`/issues/${issueNumber}`), fetcher),
  )

  if (issue.pull_request || !isPublishedIssue(issue, BLOG_PUBLISH_LABEL)) {
    return undefined
  }

  return normalizeIssue(issue)
}
