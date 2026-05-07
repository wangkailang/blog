export type GitHubIssueLabel = string | { name: string }

export type GitHubIssue = {
  number: number
  title: string
  body: string | null
  html_url: string
  created_at: string
  updated_at: string
  labels: GitHubIssueLabel[]
  pull_request?: unknown
  user: {
    login: string
    avatar_url: string
    html_url: string
  } | null
}

export type BlogPost = {
  id: number
  slug: string
  title: string
  body: string
  excerpt: string
  url: string
  coverImage?: string
  readingTime: number
  createdAt: string
  updatedAt: string
  labels: string[]
  author: {
    login: string
    avatarUrl: string
    url: string
  }
}

export type BlogSiteOwner = {
  login: string
  avatarUrl: string
  url: string
}

export type BlogData = {
  generatedAt: string
  repository: string
  label: string
  posts: BlogPost[]
  /** Repo owner from GitHub API when syncing; UI falls back to first post author. */
  siteOwner?: BlogSiteOwner
}
