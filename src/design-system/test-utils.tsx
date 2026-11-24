// Shared helpers for design-system component tests.
//
// Importing '../i18n' initialises the same i18next instance the app uses, so
// components under test resolve their fragment copy exactly as in the app.
// Tests must NOT hard-code copy that lives in fragments: use `tx(key)` to
// read the expected string from the fragment instead.
import '../i18n'
import i18n from '../i18n'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Vitest runs without globals here, so Testing Library's automatic
// cleanup does not attach itself: unmount every render after each test,
// otherwise earlier renders stay in the document and queries match twice.
afterEach(() => {
  cleanup()
})

export { render, screen, fireEvent, within } from '@testing-library/react'

export function tx(key: string, options?: Record<string, unknown>): string {
  return i18n.t(key, options) as string
}
