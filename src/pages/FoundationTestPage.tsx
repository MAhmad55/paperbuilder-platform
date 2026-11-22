import { useTranslation } from 'react-i18next'
import { PageHeader } from '../shell/PageHeader'

/**
 * Phase 0 acceptance: switching language must flip the layout correctly.
 * This page contains sidebar/main splits, directional chevrons, bidi numbers,
 * and mixed text — panels mirror in RTL.
 */
export function FoundationTestPage() {
  const { t } = useTranslation()

  return (
    <div>
      <PageHeader
        title={t('test.title')}
        lead={t('test.lead')}
        breadcrumb={[{ label: t('nav.dashboard'), to: '/' }, { label: t('test.title') }]}
      />

      <div className="test-grid">
        <aside className="test-side" aria-label={t('test.rail')}>
          <div className="test-side-title">{t('test.rail')}</div>
          <ul className="test-side-list">
            {['home', 'school', 'teacher'].map((key) => (
              <li key={key} className="test-side-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="flip-rtl"><path d="M9 18l6-6-6-6"/></svg>
                <span>{t(`roles.${key === 'school' ? 'schoolAdmin' : key === 'teacher' ? 'teacher' : 'superAdmin'}`)}</span>
              </li>
            ))}
          </ul>
        </aside>

        <section className="test-main">
          <h2>{t('test.main')}</h2>
          <p>{t('test.numbers')}</p>
          <p className="test-numbers"><bdi className="bdi">{t('test.numbersSample')}</bdi></p>
          <div className="test-band" style={{ background: 'var(--ink-100)' }}>
            <span>{t('test.bandLtr')}</span><span>{t('test.bandRtl')}</span>
          </div>
          <div className="test-band" style={{ background: 'var(--mark-300)', color: 'var(--ink-900)' }}>
            <span>{t('test.bandHiLeft')}</span><span>{t('test.bandHiRight')}</span>
          </div>
          <h3>{t('test.h3')}</h3>
          <p>
            <bdi className="bdi">{t('test.dateLine')}</bdi>
          </p>
        </section>
      </div>
    </div>
  )
}

export default FoundationTestPage
