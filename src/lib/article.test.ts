import { describe, expect, it } from 'vitest'
import { aOrAn } from './article.ts'

describe('aOrAn (D-092 rule 7)', () => {
  it('uses "an" where the number starts with a vowel sound', () => {
    for (const n of [8, 11, 18, 80, 85, 800, 11000, 18000]) expect(aOrAn(n)).toBe('an')
  })
  it('uses "a" otherwise', () => {
    for (const n of [1, 5, 10, 12, 20, 30, 45, 100, 110, 180, 1100]) expect(aOrAn(n)).toBe('a')
  })
})
