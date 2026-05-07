// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { GitHubIssue } from './blog/types'

const liveIssue = (overrides: Partial<GitHubIssue> = {}): GitHubIssue => ({
  number: 9,
  title: 'Live GitHub API Post',
  body: 'This article came from the GitHub API.',
  html_url: 'https://github.com/wangkailang/blog/issues/9',
  created_at: '2026-05-03T10:00:00Z',
  updated_at: '2026-05-04T10:00:00Z',
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

describe('App', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/')
    localStorage.clear()
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({ matches: false })),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders posts loaded from the GitHub issues list API', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse([liveIssue()])))

    render(<App />)

    expect(
      (await screen.findAllByRole('heading', { name: 'Live GitHub API Post' }))[0],
    ).toBeVisible()
  })

  it('renders a post loaded from the GitHub issue detail API', async () => {
    window.history.pushState({}, '', '/posts/9-live-github-api-post')
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      return jsonResponse(url.endsWith('/issues/9') ? liveIssue() : [])
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    expect((await screen.findAllByText('This article came from the GitHub API.'))[0]).toBeVisible()
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.github.com/repos/wangkailang/blog/issues/9',
      expect.any(Object),
    )
  })
})
