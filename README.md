# Issues Blog

基于 Vite + React 的静态博客。GitHub Issues 是内容源，前端会在运行时通过 GitHub API 读取 `wangkailang/blog` 中带有 `Published` label 的 issues，并通过 GitHub Actions 部署到 GitHub Pages。

## 技术栈

- Vite 8 + React 19
- React Router 7
- React Markdown + remark-gfm
- Vitest
- GitHub Actions + GitHub Pages

## 本地开发

```bash
npm install
npm run dev
```

本地开发时页面会直接请求 GitHub API。仓库需要公开，或浏览器请求需要有可访问的网络环境。

## 从 GitHub Issues 发布文章

给 `wangkailang/blog` 中的 issue 添加 `Published` label 即可发布。首页会读取 issues 列表，文章详情页会按 URL slug 开头的 issue number 实时读取 issue 详情。

内容不再通过构建脚本同步，也不需要在构建时提供 `GITHUB_TOKEN`。

## 部署到 GitHub Pages

1. 把项目推送到 GitHub 仓库的 `main` 分支。
2. 在仓库 Settings -> Pages 中，将 Source 设为 GitHub Actions。
3. 新建或编辑 issue，并添加 `Published` label。
4. `.github/workflows/deploy.yml` 会在代码推送或手动触发时构建并部署 `dist`。

Vite 的 `base` 会根据 `GITHUB_REPOSITORY` 自动推断：

- `owner.github.io` 仓库使用 `/`
- 普通项目仓库使用 `/<repo>/`
- 如需自定义，可设置 `VITE_BASE_PATH=/`

## 可用命令

```bash
npm test -- --run
npm run lint
npm run build
npm run preview
```
