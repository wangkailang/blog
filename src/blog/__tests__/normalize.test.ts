import { describe, expect, it } from 'vitest'
import {
  extractCoverImage,
  getReadingTime,
  isPublishedIssue,
  normalizeIssue,
  slugify,
  stripLeadingCoverImage,
} from '../normalize'
import type { GitHubIssue } from '../types'

const issue = (overrides: Partial<GitHubIssue> = {}): GitHubIssue => ({
  number: 42,
  title: 'Designing With GitHub Issues',
  body: '![Cover](https://example.com/cover.jpg)\n\nA thoughtful post about writing in public.',
  html_url: 'https://github.com/octo/blog/issues/42',
  created_at: '2026-04-12T10:00:00Z',
  updated_at: '2026-04-13T10:00:00Z',
  labels: [{ name: 'Published' }, { name: 'Design' }],
  user: {
    login: 'octocat',
    avatar_url: 'https://github.com/images/error/octocat_happy.gif',
    html_url: 'https://github.com/octocat',
  },
  ...overrides,
})

describe('slugify', () => {
  it('creates stable URL slugs from issue titles and issue numbers', () => {
    expect(slugify('Hello, React Router & Vite!', 17)).toBe(
      '17-hello-react-router-vite',
    )
  })

  it('falls back to the issue number when a title has no ASCII words', () => {
    expect(slugify('你好，世界', 8)).toBe('8')
  })
})

describe('isPublishedIssue', () => {
  it('matches the Published label case-insensitively', () => {
    expect(isPublishedIssue(issue({ labels: [{ name: 'published' }] }))).toBe(
      true,
    )
  })

  it('ignores issues without the published label', () => {
    expect(isPublishedIssue(issue({ labels: [{ name: 'Draft' }] }))).toBe(
      false,
    )
  })
})

describe('extractCoverImage', () => {
  it('returns the first Markdown image URL from the issue body', () => {
    expect(extractCoverImage(issue().body)).toBe('https://example.com/cover.jpg')
  })

  it('returns undefined when no image exists', () => {
    expect(extractCoverImage('Just text')).toBeUndefined()
  })
})

describe('getReadingTime', () => {
  it('rounds short articles up to one minute', () => {
    expect(getReadingTime('Short post.')).toBe(1)
  })

  it('counts longer content by word volume', () => {
    expect(getReadingTime(Array.from({ length: 420 }, () => 'word').join(' '))).toBe(
      2,
    )
  })
})

describe('normalizeIssue', () => {
  it('maps a GitHub issue into a blog post', () => {
    expect(normalizeIssue(issue())).toMatchObject({
      id: 42,
      slug: '42-designing-with-github-issues',
      title: 'Designing With GitHub Issues',
      url: 'https://github.com/octo/blog/issues/42',
      coverImage: 'https://example.com/cover.jpg',
      labels: ['Published', 'Design'],
      author: {
        login: 'octocat',
        avatarUrl: 'https://github.com/images/error/octocat_happy.gif',
        url: 'https://github.com/octocat',
      },
    })
  })

  it('builds an excerpt without Markdown image syntax', () => {
    expect(normalizeIssue(issue()).excerpt).toBe(
      'A thoughtful post about writing in public.',
    )
  })
})

describe('stripLeadingCoverImage', () => {
  it('removes the first leading Markdown image from article body rendering', () => {
    expect(stripLeadingCoverImage('![Cover](https://example.com/a.jpg)\n\nBody text')).toBe(
      'Body text',
    )
  })

  it('keeps inline images that are not the leading cover', () => {
    const body = 'Intro\n\n![Diagram](https://example.com/diagram.png)'

    expect(stripLeadingCoverImage(body)).toBe(body)
  })
})
