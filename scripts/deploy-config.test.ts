import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('GitHub Pages deployment', () => {
  it('builds the custom domain from the site root', () => {
    const workflow = readFileSync(
      new URL('../.github/workflows/deploy.yml', import.meta.url),
      'utf8',
    )
    const buildStep = workflow.match(
      /- name: Build blog[\s\S]*?(?=\n\s+- name:|\n\s+- uses:|$)/,
    )?.[0]

    expect(buildStep).toMatch(/\n\s+VITE_BASE_PATH:\s*\/[ \t]*$/m)
  })
})
