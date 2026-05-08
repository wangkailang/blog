import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  Clock3,
  Moon,
  Sun,
  Tag,
} from 'lucide-react'
import ReactMarkdown, { type Components } from 'react-markdown'
import {
  BrowserRouter,
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useParams,
} from 'react-router'
import remarkGfm from 'remark-gfm'
import { stripLeadingCoverImage } from './blog/normalize'
import {
  BLOG_PUBLISH_LABEL,
  BLOG_REPOSITORY,
  fetchIssuePost,
  fetchPublishedPosts,
} from './blog/github'
import type { BlogPost } from './blog/types'

type Theme = 'light' | 'dark'
type MermaidDiagramState =
  | { chart: string; status: 'loading' }
  | { chart: string; status: 'rendered'; svg: string }
  | { chart: string; status: 'failed' }

const SITE_DISPLAY_NAME = 'Kilian'
const SITE_GITHUB_PROFILE = {
  avatarUrl: 'https://github.com/wangkailang.png',
}

const fallbackCover = `${import.meta.env.BASE_URL}editorial-cover.png`

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

const markdownComponents: Components = {
  a({ node, href, children, ...props }) {
    void node
    const isExternal = href?.startsWith('http')

    return (
      <a
        {...props}
        href={href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noreferrer' : undefined}
      >
        {children}
      </a>
    )
  },
  img({ node, ...props }) {
    void node
    return <img {...props} loading="lazy" />
  },
  code({ node, className, children, ...props }) {
    void node
    const language = className?.match(/language-(?<language>[\w-]+)/)?.groups?.language

    if (language === 'mermaid') {
      return <MermaidDiagram chart={String(children).replace(/\n$/, '')} />
    }

    return (
      <code {...props} className={className}>
        {children}
      </code>
    )
  },
}

function getInitialTheme(): Theme {
  const stored = localStorage.getItem('theme')
  if (stored === 'light' || stored === 'dark') {
    return stored
  }

  return 'light'
}

function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    localStorage.setItem('theme', theme)
  }, [theme])

  return {
    theme,
    toggleTheme: () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
  }
}

function formatDate(value: string) {
  return dateFormatter.format(new Date(value))
}

function resolveMediaSource(source: string | undefined) {
  if (!source) {
    return fallbackCover
  }

  if (source.startsWith('/')) {
    return `${import.meta.env.BASE_URL}${source.replace(/^\/+/, '')}`
  }

  return source
}

function repositoryIssuesUrl() {
  const query = encodeURIComponent(`is:issue label:${BLOG_PUBLISH_LABEL}`)
  return `https://github.com/${BLOG_REPOSITORY}/issues?q=${query}`
}

function getIssueNumberFromSlug(slug: string | undefined): number | undefined {
  const issueNumber = Number(slug?.match(/^\d+/)?.[0])
  return Number.isInteger(issueNumber) && issueNumber > 0 ? issueNumber : undefined
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value))
}

function App() {
  const { theme, toggleTheme } = useTheme()

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ScrollToTop />
      <SiteShell theme={theme} onToggleTheme={toggleTheme}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/posts/:slug" element={<PostPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </SiteShell>
    </BrowserRouter>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 })
  }, [pathname])

  return null
}

type SiteShellProps = {
  children: ReactNode
  theme: Theme
  onToggleTheme: () => void
}

function SiteShell({ children, theme, onToggleTheme }: SiteShellProps) {
  const issuesUrl = repositoryIssuesUrl()

  return (
    <>
      <header className="site-header">
        <Link className="brand" to="/" aria-label={`${SITE_DISPLAY_NAME} 首页`}>
          <BrandAvatar avatarUrl={SITE_GITHUB_PROFILE.avatarUrl} />
          <span>{SITE_DISPLAY_NAME}</span>
        </Link>
        <nav className="site-nav" aria-label="主导航">
          <NavLink to="/" end>
            文章
          </NavLink>
          {issuesUrl ? (
            <a href={issuesUrl} target="_blank" rel="noreferrer">
              Issues <ArrowUpRight size={14} strokeWidth={2} />
            </a>
          ) : null}
        </nav>
        <button
          className="icon-button"
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'}
          title={theme === 'dark' ? '浅色主题' : '深色主题'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>
      <main>{children}</main>
      <Footer />
    </>
  )
}

function HomePage() {
  const [posts, setPosts] = useState<BlogPost[]>()
  const [error, setError] = useState<Error>()
  const featuredPost = posts?.[0]
  const recentPosts = useMemo(
    () => posts?.filter((post) => post.slug !== featuredPost?.slug) ?? [],
    [featuredPost?.slug, posts],
  )

  useEffect(() => {
    let isCurrent = true

    fetchPublishedPosts()
      .then((nextPosts) => {
        if (isCurrent) {
          setPosts(nextPosts)
          setError(undefined)
        }
      })
      .catch((nextError: unknown) => {
        if (isCurrent) {
          setError(toError(nextError))
        }
      })

    return () => {
      isCurrent = false
    }
  }, [])

  if (error) {
    return <ErrorState />
  }

  if (!posts) {
    return <LoadingState />
  }

  if (!featuredPost) {
    return <EmptyState />
  }

  return (
    <>
      <section className="home-hero">
        <div className="hero-copy">
          <h1>{SITE_DISPLAY_NAME}</h1>
          <p>
            一块给想法落地的写作白板。文章从 GitHub Issues 实时同步，保留工程现场的边角、节奏和火花。
          </p>
          <div className="hero-stats" aria-label="博客统计">
            <span>{posts.length} POSTS</span>
            <span>GITHUB ISSUES</span>
            <span>LABEL: {BLOG_PUBLISH_LABEL}</span>
          </div>
        </div>
        <FeaturedPost post={featuredPost} />
      </section>

      <section className="section-heading" aria-labelledby="recent-posts">
        <div>
          <h2 id="recent-posts">最新文章</h2>
          <p>按发布时间排序，最新 issue 会撞进最前面。</p>
        </div>
      </section>

      <section className="post-list" aria-label="文章列表">
        {recentPosts.length ? (
          recentPosts.map((post) => <PostRow key={post.slug} post={post} />)
        ) : (
          <PostRow post={featuredPost} />
        )}
      </section>
    </>
  )
}

function FeaturedPost({ post }: { post: BlogPost }) {
  return (
    <article className={post.coverImage ? 'featured-post' : 'featured-post featured-post--text-only'}>
      {post.coverImage ? (
        <Link className="featured-media" to={`/posts/${post.slug}`}>
          <CoverImage src={post.coverImage} eager />
        </Link>
      ) : null}
      <div className="featured-content">
        <PostMeta post={post} compact />
        <h2>
          <Link to={`/posts/${post.slug}`}>{post.title}</Link>
        </h2>
        <p>{post.excerpt}</p>
        <Link className="text-link" to={`/posts/${post.slug}`}>
          阅读文章 <ArrowUpRight size={16} strokeWidth={2} />
        </Link>
      </div>
    </article>
  )
}

function PostRow({ post }: { post: BlogPost }) {
  return (
    <article className={post.coverImage ? 'post-row' : 'post-row post-row--text-only'}>
      <div className="post-row-main">
        <PostMeta post={post} compact />
        <h3>
          <Link to={`/posts/${post.slug}`}>{post.title}</Link>
        </h3>
        <p>{post.excerpt}</p>
        <div className="label-row" aria-label="文章标签">
          {post.labels
            .filter((label) => label.toLowerCase() !== BLOG_PUBLISH_LABEL.toLowerCase())
            .slice(0, 3)
            .map((label) => (
              <span key={label}>{label}</span>
          ))}
        </div>
      </div>
      {post.coverImage ? (
        <Link className="post-row-media" to={`/posts/${post.slug}`} aria-label={post.title}>
          <CoverImage src={post.coverImage} />
        </Link>
      ) : null}
    </article>
  )
}

function PostPage() {
  const { slug } = useParams()
  const issueNumber = getIssueNumberFromSlug(slug)
  const [postResult, setPostResult] = useState<{
    issueNumber: number
    post?: BlogPost
    error?: Error
  }>()

  useEffect(() => {
    if (!issueNumber) {
      return
    }

    let isCurrent = true

    fetchIssuePost(issueNumber)
      .then((nextPost) => {
        if (isCurrent) {
          setPostResult({ issueNumber, post: nextPost })
        }
      })
      .catch((nextError: unknown) => {
        if (isCurrent) {
          setPostResult({ issueNumber, error: toError(nextError) })
        }
      })

    return () => {
      isCurrent = false
    }
  }, [issueNumber])

  if (!issueNumber) {
    return <NotFoundPage />
  }

  if (postResult?.issueNumber !== issueNumber) {
    return <LoadingState />
  }

  if (postResult.error) {
    return <ErrorState />
  }

  if (!postResult.post) {
    return <NotFoundPage />
  }

  const { post } = postResult

  return (
    <article className="article-page">
      <Link className="back-link" to="/">
        <ArrowLeft size={16} strokeWidth={2} /> 全部文章
      </Link>
      <header className="article-hero">
        <PostMeta post={post} />
        <h1>{post.title}</h1>
        <p>{post.excerpt}</p>
        <Author post={post} />
      </header>

      {post.coverImage ? (
        <figure className="article-cover">
          <CoverImage src={post.coverImage} eager />
        </figure>
      ) : null}

      <div className="article-grid">
        <div className="markdown-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {stripLeadingCoverImage(post.body)}
          </ReactMarkdown>
        </div>
        <aside className="article-aside" aria-label="文章信息">
          <a className="source-link" href={post.url} target="_blank" rel="noreferrer">
            <ArrowUpRight size={18} /> 查看原始 Issue
          </a>
          <div className="aside-block">
            <span>更新于</span>
            <strong>{formatDate(post.updatedAt)}</strong>
          </div>
          <div className="aside-block">
            <span>标签</span>
            <div className="aside-labels">
              {post.labels.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </article>
  )
}

function MermaidDiagram({ chart }: { chart: string }) {
  const reactId = useId()
  const diagramId = `mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`
  const [diagram, setDiagram] = useState<MermaidDiagramState>({ chart, status: 'loading' })

  useEffect(() => {
    let cancelled = false

    import('mermaid')
      .then(({ default: mermaid }) => {
        mermaid.initialize({
          securityLevel: 'strict',
          startOnLoad: false,
          theme: 'base',
        })

        return mermaid.render(diagramId, chart)
      })
      .then((result) => {
        document.getElementById(`d${diagramId}`)?.remove()

        if (!cancelled) {
          setDiagram({ chart, status: 'rendered', svg: result.svg })
        }
      })
      .catch(() => {
        document.getElementById(`d${diagramId}`)?.remove()

        if (!cancelled) {
          setDiagram({ chart, status: 'failed' })
        }
      })

    return () => {
      cancelled = true
    }
  }, [chart, diagramId])

  const currentDiagram: MermaidDiagramState =
    diagram.chart === chart ? diagram : { chart, status: 'loading' }

  if (currentDiagram.status === 'failed') {
    return (
      <pre className="mermaid-fallback">
        <code className="language-mermaid">{chart}</code>
      </pre>
    )
  }

  return (
    <div
      className={
        currentDiagram.status === 'rendered'
          ? 'mermaid-diagram'
          : 'mermaid-diagram mermaid-diagram--loading'
      }
      role="img"
      aria-label="Mermaid diagram"
      aria-busy={currentDiagram.status === 'rendered' ? undefined : true}
      dangerouslySetInnerHTML={
        currentDiagram.status === 'rendered' ? { __html: currentDiagram.svg } : undefined
      }
    />
  )
}

function BrandAvatar({ avatarUrl }: { avatarUrl?: string }) {
  const [failed, setFailed] = useState(false)

  if (!avatarUrl || failed) {
    return <span className="brand-mark" aria-hidden="true" />
  }

  return (
    <img
      className="brand-avatar"
      src={avatarUrl}
      alt=""
      width={28}
      height={28}
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}

function PostMeta({ post, compact = false }: { post: BlogPost; compact?: boolean }) {
  return (
    <div className={compact ? 'post-meta post-meta--compact' : 'post-meta'}>
      <span>
        <Calendar size={compact ? 14 : 16} strokeWidth={2} />
        {formatDate(post.createdAt)}
      </span>
      <span>
        <Clock3 size={compact ? 14 : 16} strokeWidth={2} />
        {post.readingTime} 分钟
      </span>
      {!compact ? (
        <span>
          <Tag size={16} strokeWidth={2} />
          {post.labels[0] ?? BLOG_PUBLISH_LABEL}
        </span>
      ) : null}
    </div>
  )
}

function Author({ post }: { post: BlogPost }) {
  const [imageFailed, setImageFailed] = useState(false)
  const initial = post.author.login.slice(0, 1).toUpperCase()

  return (
    <a className="author" href={post.author.url} target="_blank" rel="noreferrer">
      {imageFailed ? (
        <span className="avatar-fallback" aria-hidden="true">
          {initial}
        </span>
      ) : (
        <img src={post.author.avatarUrl} alt="" onError={() => setImageFailed(true)} />
      )}
      <span>{post.author.login}</span>
    </a>
  )
}

function CoverImage({ src, eager = false }: { src: string | undefined; eager?: boolean }) {
  const resolvedSource = resolveMediaSource(src)
  const [failedSource, setFailedSource] = useState<string>()
  const imageSource = failedSource === resolvedSource ? fallbackCover : resolvedSource

  return (
    <img
      src={imageSource}
      alt=""
      loading={eager ? 'eager' : 'lazy'}
      onError={() => setFailedSource(resolvedSource)}
    />
  )
}

function EmptyState() {
  return (
    <section className="empty-state">
      <h1>暂无文章</h1>
      <p>给 GitHub issue 添加 Published label 后，刷新页面就会从 GitHub API 读取。</p>
    </section>
  )
}

function LoadingState() {
  return (
    <section className="empty-state">
      <h1>正在读取文章</h1>
      <p>正在从 GitHub Issues 实时获取内容。</p>
    </section>
  )
}

function ErrorState() {
  return (
    <section className="empty-state">
      <h1>读取失败</h1>
      <p>暂时无法从 GitHub API 获取文章，请稍后刷新重试。</p>
    </section>
  )
}

function NotFoundPage() {
  return (
    <section className="empty-state">
      <h1>页面不存在</h1>
      <p>这篇文章可能还没有发布，或者链接已经更新。</p>
      <Link className="text-link" to="/">
        返回首页 <ArrowUpRight size={16} strokeWidth={2} />
      </Link>
    </section>
  )
}

function Footer() {
  return (
    <footer className="site-footer">
      <span>Built with Vite, React, and GitHub Issues.</span>
      <span>Live from {BLOG_REPOSITORY}</span>
    </footer>
  )
}

export default App
