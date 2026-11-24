import { describe, it, expect, beforeEach } from 'vitest'
import { PlatformService, resetMockData } from './mock-store'
import { DEFAULT_PLATFORM_SETTINGS } from '../mock/data'

beforeEach(() => resetMockData())

describe('legal text resolution (Phase 7, B10 gap)', () => {
  it('seed settings fall back to the static i18n copy (no custom text saved)', () => {
    expect(PlatformService.getLegalText('terms', 'en')).toBeNull()
    expect(PlatformService.getLegalText('terms', 'ur')).toBeNull()
    expect(PlatformService.getLegalText('privacy', 'en')).toBeNull()
    expect(PlatformService.getLegalText('privacy', 'ur')).toBeNull()
  })

  it('saved custom text wins over the fallback, per doc and language', () => {
    PlatformService.updateSettings({ legalTermsEn: 'Custom terms for our schools.' })
    expect(PlatformService.getLegalText('terms', 'en')).toBe('Custom terms for our schools.')
    // Other doc / language untouched: still fallback.
    expect(PlatformService.getLegalText('privacy', 'en')).toBeNull()
    expect(PlatformService.getLegalText('terms', 'ur')).toBeNull()
    PlatformService.updateSettings({ legalPrivacyUr: 'اپنی رازداری کی شرائط۔' })
    expect(PlatformService.getLegalText('privacy', 'ur')).toBe('اپنی رازداری کی شرائط۔')
  })

  it('blank custom text falls back', () => {
    PlatformService.updateSettings({ legalTermsEn: '   ' })
    expect(PlatformService.getLegalText('terms', 'en')).toBeNull()
  })

  it('re-saving the seed text still falls back (seed is not custom text)', () => {
    PlatformService.updateSettings({ legalTermsEn: DEFAULT_PLATFORM_SETTINGS.legalTermsEn })
    expect(PlatformService.getLegalText('terms', 'en')).toBeNull()
  })
})
