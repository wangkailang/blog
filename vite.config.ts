import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function getBasePath() {
  const explicitBase = process.env.VITE_BASE_PATH || process.env.BASE_PATH
  if (explicitBase) {
    return explicitBase.endsWith('/') ? explicitBase : `${explicitBase}/`
  }

  const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/')
  if (!owner || !repo || repo.toLowerCase() === `${owner.toLowerCase()}.github.io`) {
    return '/'
  }

  return `/${repo}/`
}

// https://vite.dev/config/
export default defineConfig({
  base: getBasePath(),
  plugins: [react()],
})
