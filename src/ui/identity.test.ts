/// <reference types="node" />
// EXEC-13.1 commit B (D-087): brand black, tab bar, wordmark and icon.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url))
const text = (path: string) => read(path).toString('utf8')
const md5 = (path: string) => createHash('md5').update(read(path)).digest('hex')

describe('icons by md5 (task 3)', () => {
  const files: Record<string, string> = {
    '../../public/icon.svg': '6cfad95c9fb18f76938528984a0b2627',
    '../../design/icon-maskable.svg': '579142575063be489845973f6670e140',
    '../../public/pwa-192.png': 'b3f126321ff863a86256eb44be1d1418',
    '../../public/pwa-512.png': '64c131c8770341eabf09d112afbf2695',
    '../../public/apple-touch-icon.png': '16e2ccd2af9f92807a511e007a476931',
    '../../public/pwa-maskable-192.png': '33390a0a74dd1b1c8a7f40c9cacba5a6',
    '../../public/pwa-maskable-512.png': '9f87038f6b907575ebb338663e6ed91b',
  }
  for (const [path, hash] of Object.entries(files)) it(`${path.replace('../../', '')} is ${hash}`, () => expect(md5(path)).toBe(hash))
})

describe('manifest and page (task 4)', () => {
  const config = text('../../vite.config.ts')
  it('theme and background colours are the brand black', () => {
    expect(config).toContain("theme_color: '#1d1d1f',")
    expect(config).toContain("background_color: '#1d1d1f',")
  })
  it('the maskable entries use the maskable icons; the any entries are unchanged', () => {
    expect(config).toContain("{ src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' }")
    expect(config).toContain("{ src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }")
    expect(config).toContain("{ src: 'pwa-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' }")
    expect(config).toContain("{ src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }")
  })
  it('the touch icon link points at apple-touch-icon.png', () => {
    expect(text('../../index.html')).toContain('<link rel="apple-touch-icon" href="/BYOB-fit/apple-touch-icon.png" />')
  })
})

/** Custom properties declared in the first block that starts at `opener`. */
function tokens(css: string, opener: string): Map<string, string> {
  const start = css.indexOf(opener)
  if (start < 0) throw new Error(`missing block: ${opener}`)
  const body = css.slice(start + opener.length, css.indexOf('}', start))
  return new Map(
    body
      .split(';')
      .map((line) => line.split(':').map((part) => part.trim()))
      .filter(([name]) => name?.startsWith('--'))
      .map(([name, ...value]) => [name, value.join(':')] as [string, string]),
  )
}

describe('tab tokens per mode (task 5)', () => {
  const css = text('../index.css')
  const expectTab = (block: Map<string, string>, values: Record<string, string>) => {
    for (const [name, value] of Object.entries(values)) expect(block.get(name), name).toBe(value)
  }
  it('light: brand black bar, no pill', () => {
    expectTab(tokens(css, ':root {'), { '--tabbar': '#1d1d1f', '--tabbar-edge': '#2c2c2e', '--tab-inactive': '#a1a1a6', '--tab-active': '#fdfcf9', '--tab-pill': 'transparent' })
  })
  const dark = { '--tabbar': '#a2aaad', '--tabbar-edge': '#8c9497', '--tab-inactive': '#3a3a3c', '--tab-active': '#000000', '--tab-pill': '#ffffff' }
  it('system dark: silver bar with a white pill', () => {
    expectTab(tokens(css, '@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {'), dark)
  })
  it('chosen dark: the same', () => {
    expectTab(tokens(css, ':root[data-theme="dark"] {'), dark)
  })
  it('the active tab draws the pill', () => {
    expect(text('./v3.css')).toMatch(/\.tab--active \{[^}]*background: var\(--tab-pill\);[^}]*border-radius: 22px;[^}]*margin: 0 6px;/)
  })
})

describe('the wordmark uses no navy (task 5)', () => {
  const css = text('./v3.css')
  const rule = (selector: string) => css.slice(css.indexOf(`${selector} {`), css.indexOf('}', css.indexOf(`${selector} {`)))
  it('ink, with the plate in currentColor', () => {
    expect(rule('.wordmark')).toContain('color: var(--ink);')
    expect(rule('.wordmark__plate')).toContain('border: 5.5px solid currentColor;')
    expect(rule('.wordmark__plate span')).toContain('background: currentColor;')
    for (const selector of ['.wordmark', '.wordmark__plate', '.wordmark__plate span', '.wordmark__type']) expect(rule(selector), selector).not.toContain('navy')
  })
  it('navy stays only on the AI marks', () => {
    const uses = [...css.matchAll(/([^\n{}]+)\{[^}]*var\(--navy\)/g)].map((m) => m[1].trim())
    expect(uses).toEqual(['.ai-tag', '.ai-banner__text', '.ob-tip'])
  })
})
