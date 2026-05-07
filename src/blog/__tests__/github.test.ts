import { describe, expect, it, vi } from 'vitest'
import { fetchIssuePost, fetchPublishedPosts } from '../github'
import type { GitHubIssue } from '../types'

const githubIssue = (overrides: Partial<GitHubIssue> = {}): GitHubIssue => ({
  number: 7,
  title: 'Runtime Issues Blog',
  body: 'Live post body.',
  html_url: 'https://github.com/wangkailang/blog/issues/7',
  created_at: '2026-05-01T10:00:00Z',
  updated_at: '2026-05-02T10:00:00Z',
  labels: [{ name: 'Published' }],
  user: {
    login: 'wangkailang',
    avatar_url: 'https://github.com/wangkailang.png',
    html_url: 'https://github.com/wangkailang',
  },
  ...overrides,
})

function jsonResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as Response
}

describe('fetchPublishedPosts', () => {
  it('loads published issues from the wangkailang/blog GitHub API at runtime', async () => {
    const fetcher = vi.fn(async () => jsonResponse([githubIssue()]))

    const posts = await fetchPublishedPosts({ fetcher })

    expect(fetcher).toHaveBeenCalledWith(
      'https://api.github.com/repos/wangkailang/blog/issues?state=open&labels=Published&per_page=100&page=1',
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'application/vnd.github+json',
        }),
      }),
    )
    expect(posts).toHaveLength(1)
    expect(posts[0]).toMatchObject({
      id: 7,
      slug: '7-runtime-issues-blog',
      title: 'Runtime Issues Blog',
    })
  })

  it('uses browser-safe headers that do not force GitHub CORS preflight', async () => {
    const fetcher = vi.fn(async () => jsonResponse([]))

    await fetchPublishedPosts({ fetcher })

    expect(fetcher).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {
          Accept: 'application/vnd.github+json',
        },
      }),
    )
  })

  it('excludes pull requests returned by the issues API', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse([githubIssue(), githubIssue({ number: 8, pull_request: {} })]),
    )

    const posts = await fetchPublishedPosts({ fetcher })

    expect(posts.map((post) => post.id)).toEqual([7])
  })

  it('rejects malformed GitHub issues list responses', async () => {
    const fetcher = vi.fn(async () => jsonResponse([{ number: 7 }]))

    await expect(fetchPublishedPosts({ fetcher })).rejects.toThrow(
      'Unexpected GitHub issues response',
    )
  })

  it('continues reading pages while GitHub returns full pages', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) =>
      githubIssue({ number: index + 1 }),
    )
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(firstPage))
      .mockResolvedValueOnce(jsonResponse([githubIssue({ number: 101 })]))

    const posts = await fetchPublishedPosts({ fetcher })

    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(fetcher).toHaveBeenLastCalledWith(
      'https://api.github.com/repos/wangkailang/blog/issues?state=open&labels=Published&per_page=100&page=2',
      expect.any(Object),
    )
    expect(posts).toHaveLength(101)
  })
})

describe('fetchIssuePost', () => {
  it('loads a single issue detail by issue number', async () => {
    const fetcher = vi.fn(async () => jsonResponse(githubIssue()))

    const post = await fetchIssuePost(7, { fetcher })

    expect(fetcher).toHaveBeenCalledWith(
      'https://api.github.com/repos/wangkailang/blog/issues/7',
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'application/vnd.github+json',
        }),
      }),
    )
    expect(post?.body).toBe('Live post body.')
  })

  it('does not expose issue details without the Published label', async () => {
    const fetcher = vi.fn(async () => jsonResponse(githubIssue({ labels: [{ name: 'Draft' }] })))

    await expect(fetchIssuePost(7, { fetcher })).resolves.toBeUndefined()
  })

  it('rejects malformed GitHub issue detail responses', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ number: 7 }))

    await expect(fetchIssuePost(7, { fetcher })).rejects.toThrow(
      'Unexpected GitHub issue response',
    )
  })
})
