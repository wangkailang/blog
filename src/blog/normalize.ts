import type { BlogPost, GitHubIssue, GitHubIssueLabel } from './types'

const WORDS_PER_MINUTE = 220
const DEFAULT_AUTHOR = {
  login: 'github',
  avatarUrl: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
  url: 'https://github.com',
}

export function getLabelName(label: GitHubIssueLabel): string {
  return typeof label === 'string' ? label : label.name
}

export function slugify(title: string, issueNumber: number): string {
  const words = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return words ? `${issueNumber}-${words}` : String(issueNumber)
}

export function isPublishedIssue(
  issue: Pick<GitHubIssue, 'labels'>,
  publishLabel = 'Published',
): boolean {
  const expected = publishLabel.trim().toLowerCase()

  return issue.labels.some((label) => getLabelName(label).trim().toLowerCase() === expected)
}

export function extractCoverImage(body: string | null | undefined): string | undefined {
  if (!body) {
    return undefined
  }

  const markdownImage = body.match(/!\[[^\]]*]\((?<url>[^)\s]+)(?:\s+"[^"]*")?\)/)
  if (markdownImage?.groups?.url) {
    return markdownImage.groups.url
  }

  const htmlImage = body.match(/<img[^>]+src=["'](?<url>[^"']+)["'][^>]*>/i)
  return htmlImage?.groups?.url
}

export function getReadingTime(body: string | null | undefined): number {
  if (!body?.trim()) {
    return 1
  }

  const withoutCode = body.replace(/```[\s\S]*?```/g, ' ')
  const latinWords = withoutCode.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)?/g)?.length ?? 0
  const cjkCharacters = withoutCode.match(/[\u3400-\u9fff]/g)?.length ?? 0
  const estimatedWords = latinWords + Math.ceil(cjkCharacters / 2)

  return Math.max(1, Math.ceil(estimatedWords / WORDS_PER_MINUTE))
}

export function createExcerpt(body: string | null | undefined, maxLength = 180): string {
  if (!body) {
    return ''
  }

  const cleaned = body
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/<img[^>]*>/gi, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/[*_~>#-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (cleaned.length <= maxLength) {
    return cleaned
  }

  return `${cleaned.slice(0, maxLength).replace(/\s+\S*$/, '')}...`
}

export function stripLeadingCoverImage(body: string): string {
  return body
    .replace(/^\s*!\[[^\]]*]\([^)]*\)\s*/, '')
    .replace(/^\s*<img[^>]*>\s*/i, '')
}

export function normalizeIssue(issue: GitHubIssue): BlogPost {
  const labels = issue.labels.map(getLabelName)
  const author = issue.user
    ? {
        login: issue.user.login,
        avatarUrl: issue.user.avatar_url,
        url: issue.user.html_url,
      }
    : DEFAULT_AUTHOR

  return {
    id: issue.number,
    slug: slugify(issue.title, issue.number),
    title: issue.title,
    body: issue.body ?? '',
    excerpt: createExcerpt(issue.body),
    url: issue.html_url,
    coverImage: extractCoverImage(issue.body),
    readingTime: getReadingTime(issue.body),
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
    labels,
    author,
  }
}

export function normalizeIssues(issues: GitHubIssue[], publishLabel = 'Published'): BlogPost[] {
  return issues
    .filter((issue) => isPublishedIssue(issue, publishLabel))
    .map(normalizeIssue)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}
