import {
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import {
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  Clock3,
  Minus,
  Moon,
  Plus,
  RotateCcw,
  Sun,
  Tag,
  X,
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
import rehypeSlug from 'rehype-slug'
import { stripLeadingCoverImage } from './blog/normalize'
import {
  BLOG_PUBLISH_LABEL,
  BLOG_REPOSITORY,
  fetchIssuePost,
  fetchPublishedPosts,
} from './blog/github'
import type { BlogPost } from './blog/types'

type Theme = 'light' | 'dark'
type TocItem = { id: string; text: string; level: number }
type MermaidDiagramState =
  | { chart: string; status: 'loading' }
  | { chart: string; status: 'rendered'; svg: string }
  | { chart: string; status: 'failed' }

const SITE_DISPLAY_NAME = 'Kilian'
const HEADING_SCROLL_OFFSET = 24
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
  pre({ node, children, ...props }) {
    void node
    const mermaidChart = extractMermaidChart(children)
    if (mermaidChart !== undefined) {
      return <MermaidDiagram chart={mermaidChart} />
    }

    return <pre {...props}>{children}</pre>
  },
  code({ node, className, children, ...props }) {
    void node
    return (
      <code {...props} className={className}>
        {children}
      </code>
    )
  },
}

function extractMermaidChart(children: ReactNode): string | undefined {
  const child = Array.isArray(children) ? children.find(isValidElement) : children
  if (!isValidElement(child)) {
    return undefined
  }

  const codeChild = child as ReactElement<{ className?: string; children?: ReactNode }>
  const language = codeChild.props.className
    ?.match(/language-(?<language>[\w-]+)/)
    ?.groups?.language
  if (language !== 'mermaid') {
    return undefined
  }

  const codeChildren = codeChild.props.children
  const text = Array.isArray(codeChildren) ? codeChildren.join('') : String(codeChildren ?? '')
  return text.replace(/\n$/, '')
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

  if (posts.length === 0) {
    return <EmptyState />
  }

  return (
    <section className="home-page">
      <header className="home-page-header">
        <h1>{SITE_DISPLAY_NAME}</h1>
        <p>一块给想法落地的写作白板。文章从 GitHub Issues 实时同步。</p>
        <div className="home-page-stats" aria-label="博客统计">
          <span>{posts.length} POSTS</span>
          <span>GITHUB ISSUES</span>
          <span>LABEL: {BLOG_PUBLISH_LABEL}</span>
        </div>
      </header>

      <div className="post-list" aria-label="文章列表">
        {posts.map((post) => (
          <PostRow key={post.slug} post={post} />
        ))}
      </div>
    </section>
  )
}

function PostRow({ post }: { post: BlogPost }) {
  const visibleLabels = post.labels
    .filter((label) => label.toLowerCase() !== BLOG_PUBLISH_LABEL.toLowerCase())
    .slice(0, 3)

  return (
    <article className={post.coverImage ? 'post-row' : 'post-row post-row--text-only'}>
      <div className="post-row-main">
        <PostMeta post={post} compact />
        <h3>
          <Link to={`/posts/${post.slug}`}>{post.title}</Link>
        </h3>
        <p>{post.excerpt}</p>
        {visibleLabels.length ? (
          <div className="label-row" aria-label="文章标签">
            {visibleLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        ) : null}
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

  return <PostArticle post={post} />
}

function PostArticle({ post }: { post: BlogPost }) {
  const markdownRef = useRef<HTMLDivElement>(null)
  const [tocItems, setTocItems] = useState<TocItem[]>([])

  const refreshToc = useCallback(() => {
    const root = markdownRef.current
    if (!root) {
      return
    }

    const headings = Array.from(root.querySelectorAll<HTMLHeadingElement>('h2, h3'))
      .filter((heading) => heading.id)
      .map((heading) => ({
        id: heading.id,
        text: heading.textContent?.trim() ?? '',
        level: Number(heading.tagName.slice(1)),
      }))

    setTocItems((current) => {
      if (current.length === headings.length && current.every((item, index) => item.id === headings[index]?.id)) {
        return current
      }
      return headings
    })
  }, [])

  useEffect(() => {
    refreshToc()

    const root = markdownRef.current
    if (!root) {
      return
    }

    const observer = new MutationObserver(() => refreshToc())
    observer.observe(root, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [post.id, refreshToc])

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
        <div className="markdown-body" ref={markdownRef}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSlug]}
            components={markdownComponents}
          >
            {stripLeadingCoverImage(post.body)}
          </ReactMarkdown>
        </div>
        <aside className="article-aside" aria-label="文章信息">
          {tocItems.length >= 2 ? <TableOfContents items={tocItems} /> : null}
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

function TableOfContents({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string>(() => items[0]?.id ?? '')

  useEffect(() => {
    if (items.length === 0) {
      return
    }

    const update = () => {
      const trigger = Math.max(HEADING_SCROLL_OFFSET + 8, window.innerHeight * 0.35)
      let current = items[0]?.id
      for (const item of items) {
        const el = document.getElementById(item.id)
        if (!el) continue
        if (el.getBoundingClientRect().top <= trigger) {
          current = item.id
        } else {
          break
        }
      }
      if (current) {
        setActiveId(current)
      }
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [items])

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault()
    const target = document.getElementById(id)
    if (!target) {
      return
    }

    const top = target.getBoundingClientRect().top + window.scrollY - HEADING_SCROLL_OFFSET
    window.scrollTo({ top, behavior: 'instant' })
    history.replaceState(null, '', `#${id}`)
    setActiveId(id)
  }

  return (
    <nav className="article-toc" aria-label="文章目录">
      <span className="article-toc-title">目录</span>
      <ol>
        {items.map((item) => (
          <li
            key={item.id}
            className={item.level >= 3 ? 'article-toc-item article-toc-item--sub' : 'article-toc-item'}
          >
            <a
              href={`#${item.id}`}
              onClick={(event) => handleClick(event, item.id)}
              className={activeId === item.id ? 'is-active' : undefined}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
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

  const [viewerOpen, setViewerOpen] = useState(false)

  if (currentDiagram.status === 'failed') {
    return (
      <pre className="mermaid-fallback">
        <code className="language-mermaid">{chart}</code>
      </pre>
    )
  }

  const isRendered = currentDiagram.status === 'rendered'
  const className = isRendered
    ? 'mermaid-diagram mermaid-diagram--clickable'
    : 'mermaid-diagram mermaid-diagram--loading'

  return (
    <>
      <button
        type="button"
        className={className}
        aria-label={isRendered ? '点击放大查看 Mermaid 图' : 'Mermaid 图加载中'}
        aria-busy={isRendered ? undefined : true}
        disabled={!isRendered}
        onClick={isRendered ? () => setViewerOpen(true) : undefined}
        dangerouslySetInnerHTML={isRendered ? { __html: currentDiagram.svg } : undefined}
      />
      {viewerOpen && isRendered ? (
        <MermaidViewer svg={currentDiagram.svg} onClose={() => setViewerOpen(false)} />
      ) : null}
    </>
  )
}

const ZOOM_MIN = 0.25
const ZOOM_MAX = 8
const ZOOM_STEP = 1.2

function clampScale(value: number) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value))
}

function MermaidViewer({ svg, onClose }: { svg: string; onClose: () => void }) {
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragStateRef = useRef<{ pointerX: number; pointerY: number; panX: number; panY: number } | null>(
    null,
  )
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      } else if (event.key === '+' || event.key === '=') {
        event.preventDefault()
        setScale((current) => clampScale(current * ZOOM_STEP))
      } else if (event.key === '-' || event.key === '_') {
        event.preventDefault()
        setScale((current) => clampScale(current / ZOOM_STEP))
      } else if (event.key === '0') {
        event.preventDefault()
        setScale(1)
        setPan({ x: 0, y: 0 })
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  const handleZoomIn = () => setScale((current) => clampScale(current * ZOOM_STEP))
  const handleZoomOut = () => setScale((current) => clampScale(current / ZOOM_STEP))
  const handleReset = () => {
    setScale(1)
    setPan({ x: 0, y: 0 })
  }

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    const factor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP
    setScale((current) => clampScale(current * factor))
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return
    }
    dragStateRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      panX: pan.x,
      panY: pan.y,
    }
    setDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = dragStateRef.current
    if (!start) return
    setPan({
      x: start.panX + (event.clientX - start.pointerX),
      y: start.panY + (event.clientY - start.pointerY),
    })
  }

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current) return
    dragStateRef.current = null
    setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  return (
    <div
      className="mermaid-viewer"
      role="dialog"
      aria-modal="true"
      aria-label="Mermaid 图查看器"
    >
      <div className="mermaid-viewer-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="mermaid-viewer-toolbar">
        <span className="mermaid-viewer-scale" aria-live="polite">
          {Math.round(scale * 100)}%
        </span>
        <button type="button" onClick={handleZoomOut} aria-label="缩小" title="缩小 (-)">
          <Minus size={16} strokeWidth={2.5} />
        </button>
        <button type="button" onClick={handleZoomIn} aria-label="放大" title="放大 (+)">
          <Plus size={16} strokeWidth={2.5} />
        </button>
        <button type="button" onClick={handleReset} aria-label="重置" title="重置 (0)">
          <RotateCcw size={16} strokeWidth={2.5} />
        </button>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="关闭"
          title="关闭 (Esc)"
        >
          <X size={16} strokeWidth={2.5} />
        </button>
      </div>
      <div
        className={dragging ? 'mermaid-viewer-stage is-dragging' : 'mermaid-viewer-stage'}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onDoubleClick={handleReset}
      >
        <div
          className="mermaid-viewer-content"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    </div>
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
