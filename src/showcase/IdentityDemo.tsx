import { useTranslation } from 'react-i18next'
import Bidi from '../utils/bidi'

interface Token {
  token: string
  hex: string
  useKey: string
  fg?: string
}

interface TokenGroup {
  id: string
  titleKey: string
  tokens: Token[]
}

const TOKEN_GROUPS: TokenGroup[] = [
  {
    id: 'ink',
    titleKey: 'showcase.tokenGroups.ink',
    tokens: [
      { token: 'ink-900', hex: '#0F1733', useKey: 'copy.identity.tokenUse.ink-900', fg: '#ffffff' },
      { token: 'ink-700', hex: '#1E2A78', useKey: 'copy.identity.tokenUse.ink-700', fg: '#ffffff' },
      { token: 'ink-600', hex: '#2D3CA0', useKey: 'copy.identity.tokenUse.ink-600', fg: '#ffffff' },
      { token: 'ink-100', hex: '#E8EAF8', useKey: 'copy.identity.tokenUse.ink-100', fg: '#1E2A78' },
    ],
  },
  {
    id: 'pen',
    titleKey: 'showcase.tokenGroups.pen',
    tokens: [
      { token: 'pen-600', hex: '#C92A45', useKey: 'copy.identity.tokenUse.pen-600', fg: '#ffffff' },
      { token: 'pen-100', hex: '#FCE4E8', useKey: 'copy.identity.tokenUse.pen-100', fg: '#9B1C2E' },
    ],
  },
  {
    id: 'highlighter',
    titleKey: 'showcase.tokenGroups.highlighter',
    tokens: [
      { token: 'mark-300', hex: '#FFD84D', useKey: 'copy.identity.tokenUse.mark-300', fg: '#0F1733' },
    ],
  },
  {
    id: 'neutrals',
    titleKey: 'showcase.tokenGroups.neutrals',
    tokens: [
      { token: 'canvas', hex: '#F4F5F9', useKey: 'copy.identity.tokenUse.canvas', fg: '#4A5470' },
      { token: 'paper', hex: '#FFFFFF', useKey: 'copy.identity.tokenUse.paper', fg: '#0F1733' },
      { token: 'line', hex: '#DCE0EC', useKey: 'copy.identity.tokenUse.line', fg: '#4A5470' },
      { token: 'muted', hex: '#4A5470', useKey: 'copy.identity.tokenUse.muted', fg: '#ffffff' },
    ],
  },
]

export function TokensDemo() {
  const { t } = useTranslation()
  return (
    <div>
      {TOKEN_GROUPS.map(group => (
        <section key={group.id} className="ds-token-group" aria-label={t(group.titleKey)}>
          <h4 className="ds-token-group__title">{t(group.titleKey)}</h4>
          <div className="ds-tokens">
            {group.tokens.map(token => (
              <div key={token.token} className="ds-token">
                <div className="ds-token__swatch" style={{ background: token.hex, color: token.fg }}>
                  <Bidi>{token.hex}</Bidi>
                </div>
                <div className="ds-token__meta">
                  <div className="ds-token__name"><Bidi>{token.token}</Bidi></div>
                  <div style={{ color: 'var(--muted)', fontSize: 11 }}>{t(token.useKey)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export function TypographyDemo() {
  const { t } = useTranslation()
  return (
    <div className="ds-typo">
      <p className="pb-muted" style={{ fontSize: 12, lineHeight: 1.6 }}>{t('showcase.typographyLead')}</p>
      <div className="ds-typo__block">
        <span className="ds-typo__label">{t('copy.identity.typoH1')}</span>
        <h1 style={{ fontSize: 36 }}>{t('copy.identity.typoH1Sample')}</h1>
      </div>
      <div className="ds-typo__block">
        <span className="ds-typo__label">{t('copy.identity.typoH2')}</span>
        <h2 style={{ fontSize: 28 }}>{t('copy.identity.typoH2Sample')}</h2>
      </div>
      <div className="ds-typo__block">
        <span className="ds-typo__label">{t('copy.identity.typoH3')}</span>
        <p style={{ fontSize: 18 }}>{t('copy.identity.typoH3Sample')}</p>
        <p style={{ fontSize: 16, marginTop: 8 }}>{t('copy.identity.typoBody')}</p>
        <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 8 }}>{t('copy.identity.typoSecondary')}</p>
      </div>
      <div className="ds-typo__block">
        <span className="ds-typo__label">{t('copy.identity.typoUrduHeadings')}</span>
        <p style={{ fontFamily: 'var(--font-urdu-head)', fontSize: 22, lineHeight: 2.2 }}>{t('copy.identity.typoUrduHeadingsSample')}</p>
      </div>
      <div className="ds-typo__block">
        <span className="ds-typo__label">{t('copy.identity.typoUrduUI')}</span>
        <p style={{ fontFamily: 'var(--font-urdu-ui)', fontSize: 17, lineHeight: 2.0 }}>{t('copy.identity.typoUrduUISample')}</p>
      </div>
      <div className="ds-typo__block">
        <span className="ds-typo__label">{t('copy.identity.typoEnglishPaper')}</span>
        <p style={{ fontFamily: 'var(--font-paper-latin)', fontSize: 22, lineHeight: 1.7 }}>{t('copy.identity.typoEnglishPaperSample')}</p>
      </div>
      <div className="ds-typo__block">
        <span className="ds-typo__label">{t('copy.identity.typoArabicStack')}</span>
        <p style={{ fontSize: 14 }}><Bidi>{t('copy.identity.typoArabicStackSample')}</Bidi></p>
      </div>
    </div>
  )
}

export default function IdentityDemo() {
  const { t } = useTranslation()
  return (
    <div className="ds-identity">
      <div className="ds-identity__card">
        <span className="app-rail__logo" style={{ width: 44, height: 44, fontSize: 17 }} aria-hidden="true">PB</span>
        <span className="app-rail__brand-name" style={{ fontSize: 20 }}>PaperBuilder</span>
      </div>
      <p className="pb-muted" style={{ fontSize: 13 }}>{t('copy.identity.quote')}</p>
    </div>
  )
}
