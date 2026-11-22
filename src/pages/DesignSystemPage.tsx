import { useTranslation } from 'react-i18next'
import { PageHeader } from '../shell/PageHeader'
import IdentityDemo, { TokensDemo, TypographyDemo } from '../showcase/IdentityDemo'
import { ButtonsDemo } from '../showcase/ButtonsDemo'
import { FormsDemo } from '../showcase/FormsDemo'
import { SelectionDemos } from '../showcase/SelectionDemos'
import { OverlayDemos } from '../showcase/OverlayDemos'
import { FeedbackDemos } from '../showcase/FeedbackDemos'
import { DataDemos } from '../showcase/DataDemos'
import { PaperStudioDemos } from '../showcase/PaperStudioDemos'

const GROUPS = [
  { id: 'identity', titleKey: 'showcase.sections.identity' },
  { id: 'buttons', titleKey: 'showcase.sections.buttons' },
  { id: 'forms', titleKey: 'showcase.sections.forms' },
  { id: 'selection', titleKey: 'showcase.sections.selection' },
  { id: 'overlays', titleKey: 'showcase.sections.overlays' },
  { id: 'feedback', titleKey: 'showcase.sections.feedback' },
  { id: 'data', titleKey: 'showcase.sections.data' },
  { id: 'paper', titleKey: 'showcase.sections.paper' },
]

export function DesignSystemPage() {
  const { t } = useTranslation()

  return (
    <div className="ds">
      <PageHeader
        breadcrumb={[{ label: t('nav.dashboard'), to: '/' }, { label: t('nav.designSystem') }]}
        title={t('showcase.title')}
        lead={t('showcase.lead')}
      />

      <nav className="ds-jump" aria-label={t('showcase.jumpTo')}>
        {GROUPS.map(g => (
          <a key={g.id} href={`#section-${g.id}`}>{t(g.titleKey)}</a>
        ))}
      </nav>

      <div className="ds-group" id="section-identity">
        <h2 className="ds-group-title">{t('showcase.sections.identity')}</h2>
        <IdentityDemo />
        <div className="ds-card" style={{ marginTop: 20 }}>
          <div className="ds-demo-title">{t('showcase.tokens')}</div>
          <TokensDemo />
        </div>
        <div className="ds-card" style={{ marginTop: 20 }}>
          <div className="ds-demo-title">{t('showcase.typography')}</div>
          <TypographyDemo />
        </div>
      </div>

      <div className="ds-group" id="section-buttons">
        <h2 className="ds-group-title">{t('showcase.sections.buttons')}</h2>
        <div className="ds-grid"><ButtonsDemo /></div>
      </div>

      <div className="ds-group" id="section-forms">
        <h2 className="ds-group-title">{t('showcase.sections.forms')}</h2>
        <div className="ds-grid"><FormsDemo /></div>
      </div>

      <div className="ds-group" id="section-selection">
        <h2 className="ds-group-title">{t('showcase.sections.selection')}</h2>
        <div className="ds-grid"><SelectionDemos /></div>
      </div>

      <div className="ds-group" id="section-overlays">
        <h2 className="ds-group-title">{t('showcase.sections.overlays')}</h2>
        <div className="ds-grid"><OverlayDemos /></div>
      </div>

      <div className="ds-group" id="section-feedback">
        <h2 className="ds-group-title">{t('showcase.sections.feedback')}</h2>
        <div className="ds-grid"><FeedbackDemos /></div>
      </div>

      <div className="ds-group" id="section-data">
        <h2 className="ds-group-title">{t('showcase.sections.data')}</h2>
        <div className="ds-grid"><DataDemos /></div>
      </div>

      <div className="ds-group" id="section-paper">
        <h2 className="ds-group-title">{t('showcase.sections.paper')}</h2>
        <div className="ds-grid"><PaperStudioDemos /></div>
      </div>
    </div>
  )
}

export default DesignSystemPage
