# Issues Blog

基于 Vite + React 的静态博客。GitHub Issues 是内容源：构建期由 Actions 抓取带有 `Published` label 的 issues 写入 `public/posts.json` 快照，运行时优先读取该快照；快照缺失时再回落到 GitHub API。通过 GitHub Actions 部署到 GitHub Pages。

## 技术栈

- Vite 8 + React 19
- React Router 7
- React Markdown + remark-gfm
- Vitest
- GitHub Actions + GitHub Pages

## 本地开发

```bash
npm install

# 可选：用 PAT 抓一次内容快照，避开未鉴权 60 次/小时限速
GITHUB_TOKEN=ghp_xxx npm run snapshot

npm run dev
```

如果跳过 `npm run snapshot`，运行时会直接打 GitHub API（注意未鉴权 60 次/小时配额）。

## 从 GitHub Issues 发布文章

给 `wangkailang/blog` 中的 issue 添加 `Published` label 即可发布。首页和详情页都会先读取构建期生成的 `public/posts.json` 快照；快照里没找到的文章才回落到 GitHub API。

每次推送 `main` 触发部署时，`prebuild` 会重新抓取并覆盖快照，所以新增/修改的文章在下次部署后生效。

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
npm run snapshot   # 抓取并写入 public/posts.json（自动作为 prebuild 钩子运行）
npm run build      # tsc -b && vite build（会先跑 prebuild → snapshot）
npm run preview
```
