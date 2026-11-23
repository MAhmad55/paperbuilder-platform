import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../shell/PageHeader'
import {
  Badge, Banner, Button, Card, EmptyState, Skeleton, useToast,
} from '../../design-system'
import { PlatformService } from '../../services/mock-store'
import type { Template } from '../../mock/data'
import { Bidi } from '../../utils/bidi'
import {
  demoActor, demoModeOf, demoSchool, useSchoolDemo,
} from './shared'
import '../../styles/school.css'

/** Templates — Phase 4. School templates: view detail, duplicate, set default. */
export function SchoolTemplatesPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const { toast } = useToast()
  const demoMode = demoModeOf(params.get('demo'))
  const { loading, loadFailed, retry } = useSchoolDemo(demoMode)
  const forceEmpty = demoMode === 'empty'

  const [version, setVersion] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const actor = demoActor()
  const school = demoSchool()
  const schoolId = school?.id ?? ''

  const templates = useMemo(
    () => (forceEmpty || !schoolId ? [] : PlatformService.listTemplates(schoolId)),
    [forceEmpty, schoolId, version],
  )

  const selected: Template | undefined = useMemo(() => {
    if (selectedId) {
      const found = templates.find((x) => x.id === selectedId)
      if (found) return found
    }
    return templates[0]
  }, [templates, selectedId])

  const duplicate = () => {
    if (!selected || busy) return
    setBusy(true)
    window.setTimeout(() => {
      const result = PlatformService.duplicateTemplate(
        selected.id,
        `${selected.name}${t('school.templates.copySuffix')}`,
        actor,
      )
      setBusy(false)
      if (!result.ok) {
        toast({ variant: 'error', message: result.error })
        return
      }
      setSelectedId(result.value.id)
      setVersion((v) => v + 1)
      toast({ variant: 'success', message: t('school.templates.duplicatedToast') })
    }, 200)
  }

  const setDefault = () => {
    if (!selected || busy || selected.isDefault) return
    setBusy(true)
    window.setTimeout(() => {
      const result = PlatformService.setDefaultTemplate(selected.id, actor)
      setBusy(false)
      if (!result.ok) {
        toast({ variant: 'error', message: result.error })
        return
      }
      setVersion((v) => v + 1)
      toast({ variant: 'success', message: t('school.templates.defaultToast') })
    }, 200)
  }

  return (
    <div className="school">
      <PageHeader title={t('school.templates.title')} lead={t('school.templates.lead')} />

      {loading ? (
        <div className="school__skeleton" aria-label={t('common.loading')} role="status">
          <Skeleton variant="rect" height={48} />
          <Skeleton variant="rect" height={120} />
          <Skeleton variant="rect" height={220} />
        </div>
      ) : loadFailed ? (
        <div>
          <Banner variant="error" title={t('school.templates.error.title')}>
            {t('school.templates.error.body')}
          </Banner>
          <div className="school__retry">
            <Button variant="primary" onClick={retry}>
              {t('common.retry')}
            </Button>
          </div>
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <EmptyState
            title={t('school.templates.emptyTitle')}
            body={t('school.templates.emptyBody')}
          />
        </Card>
      ) : (
        <div className="school-layout">
          <section className="school-list" aria-label={t('school.templates.list.title')}>
            <div className="school-list__head">
              <h2>{t('school.templates.list.title')}</h2>
              <span><Bidi>{templates.length}</Bidi></span>
            </div>
            <ul className="school-items">
              {templates.map((template) => {
                const isSelected = selected?.id === template.id
                return (
                  <li key={template.id}>
                    <button
                      type="button"
                      className="school-item"
                      aria-current={isSelected ? 'true' : undefined}
                      onClick={() => setSelectedId(template.id)}
                    >
                      <span className="school-item__head">
                        <Bidi>{template.name}</Bidi>
                        {template.isDefault && (
                          <Badge tone="ink">{t('school.templates.defaultBadge')}</Badge>
                        )}
                      </span>
                      <span className="school-item__meta">
                        {t(`school.templates.layoutOptions.${template.layout === 'logo-left' ? 'logoLeft' : 'logoCenter'}`)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="school-panel" aria-label={selected?.name ?? t('school.templates.title')}>
            {selected && (
              <Card>
                <div className="school-panel__head">
                  <h2><Bidi>{selected.name}</Bidi></h2>
                  {selected.isDefault && (
                    <Badge tone="ink">{t('school.templates.defaultBadge')}</Badge>
                  )}
                </div>
                <dl className="school-facts">
                  <div>
                    <dt>{t('school.templates.detail.layout')}</dt>
                    <dd>
                      {t(`school.templates.layoutOptions.${selected.layout === 'logo-left' ? 'logoLeft' : 'logoCenter'}`)}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('school.templates.detail.bodyFont')}</dt>
                    <dd>{t(`school.templates.fontOptions.${selected.bodyFont}`)}</dd>
                  </div>
                  <div>
                    <dt>{t('school.templates.detail.footer')}</dt>
                    <dd><Bidi>{selected.footerText}</Bidi></dd>
                  </div>
                </dl>
                <div className="school-actions">
                  <Button variant="secondary" loading={busy} onClick={duplicate}>
                    {t('school.templates.duplicate')}
                  </Button>
                  <Button
                    variant="primary"
                    loading={busy}
                    disabled={selected.isDefault}
                    onClick={setDefault}
                  >
                    {t('school.templates.setDefault')}
                  </Button>
                </div>
              </Card>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

export default SchoolTemplatesPage
