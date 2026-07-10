import { describe, it, expect } from 'vitest'
import { toAuthEmail } from './auth.js'

describe('toAuthEmail', () => {
  it('appends @mush.app', () => {
    expect(toAuthEmail('mushplayer')).toBe('mushplayer@mush.app')
  })
  it('lowercases the username', () => {
    expect(toAuthEmail('BigBoiToasty')).toBe('bigboitoasty@mush.app')
  })
  it('trims surrounding whitespace', () => {
    expect(toAuthEmail('  spacy  ')).toBe('spacy@mush.app')
  })
})
