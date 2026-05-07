import { copyFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'

const indexPath = resolve('dist/index.html')
const fallbackPath = resolve('dist/404.html')

try {
  await stat(indexPath)
  await copyFile(indexPath, fallbackPath)
  console.log('Created dist/404.html for GitHub Pages SPA fallback.')
} catch (error) {
  console.error('Unable to create SPA fallback:', error)
  process.exitCode = 1
}
