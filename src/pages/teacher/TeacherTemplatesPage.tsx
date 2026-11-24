import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../shell/PageHeader'
import {
  Banner, Button, Card, Dialog, EmptyState, Input, Select, Skeleton, useToast,
} from '../../design-system'
import { PlatformService } from '../../services/mock-store'
import { Bidi } from '../../utils/bidi'
import { totalMarks } from '../../services/marks'
import { STUDIO_PRESETS } from '../../services/studio'
import {
  demoModeOf, demoTeacher, demoTeacherSchool, useSchoolDemo,
} from './shared'
import '../../styles/teacher.css'

/** Templates — Phase 5 (blueprint 4.4.5): use a school template, or save
    a personal marks pattern from a preset. */
export function TeacherTemplatesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { toast } = useToast()
  const demoMode = demoModeOf(params.get('demo'))
  const { loading, loadFailed, retry } = useSchoolDemo(demoMode)
  const forceEmpty = demoMode === 'empty'

  const [version, setVersion] = useState(0)
  const [saveOpen, setSaveOpen] = useState(false)
  const [patternName, setPatternName] = useState('')
  const [presetId, setPresetId] = useState('board-75')
  const [nameError, setNameError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const teacher = demoTeacher()
  const school = demoTeacherSchool()

  const schoolTemplates = useMemo(
    () => (forceEmpty || !school ? [] : PlatformService.listTemplates(school.id)),
    [forceEmpty, school, version],
  )
  const patterns = useMemo(
    () => (forceEmpty ? [] : PlatformService.listPersonalPatterns(teacher.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [forceEmpty, teacher.id, version],
  )

  const savePattern = () => {
    if (!patternName.trim()) {
      setNameError(t('teacher.templates.patternNameLabel'))
      window.setTimeout(() => document.getElementById('teacher-pattern-name')?.focus(), 50)
      return
    }
    const preset = STUDIO_PRESETS.find((p) => p.id === presetId) ?? STUDIO_PRESETS[0]
    const result = PlatformService.savePersonalPattern(teacher.id, {
      name: patternName.trim(),
      sections: preset.sections.map((s) => ({ ...s })),
      targetMarks: totalMarks(preset.sections),
    })
    if (!result.ok) {
      setNameError(result.error)
      return
    }
    setSaveOpen(false)
    setPatternName('')
    setNameError(null)
    setVersion((v) => v + 1)
    toast({ variant: 'success', message: t('teacher.templates.patternSave') })
  }

  const useTemplate = (templateId: string) => {
    navigate(`/teacher/studio?template=${templateId}`)
  }

  const usePattern = (patternId: string) => {
    navigate(`/teacher/studio?pattern=${patternId}`)
  }

  return (
    <div className="teacher">
      <PageHeader
        title={t('teacher.templates.title')}
        lead={t('teacher.templates.lead')}
        action={(
          <Button variant="primary" onClick={() => setSaveOpen(true)}>
            {t('teacher.templates.savePattern')}
          </Button>
        )}
      />

      {loading ? (
        <div className="teacher__skeleton" aria-label={t('common.loading')} role="status">
          <Skeleton variant="rect" height={120} />
          <Skeleton variant="rect" height={120} />
        </div>
      ) : loadFailed ? (
        <div>
          <Banner variant="error" title={t('teacher.templates.error.title')}>
            {t('teacher.templates.error.body')}
          </Banner>
          <div className="teacher__retry">
            <Button variant="primary" onClick={retry}>
              {t('common.retry')}
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <div className="teacher__section">
            <h2 className="teacher__section-title">{t('teacher.templates.schoolTitle')}</h2>
            {schoolTemplates.length === 0 ? (
              <Card>
                <EmptyState title={t('teacher.templates.schoolEmpty')} body="" />
              </Card>
            ) : (
              <div className="teacher-grid">
                {schoolTemplates.map((tpl) => (
                  <Card key={tpl.id} title={<Bidi>{tpl.name}</Bidi>}>
                    <dl className="teacher-facts">
                      <div>
                        <dt>{t('teacher.templates.layout')}</dt>
                        <dd>{tpl.layout}</dd>
                      </div>
                      <div>
                        <dt>{t('teacher.templates.bodyFont')}</dt>
                        <dd>{tpl.bodyFont}</dd>
                      </div>
                      <div>
                        <dt>{t('teacher.templates.footer')}</dt>
                        <dd><Bidi>{tpl.footerText}</Bidi></dd>
                      </div>
                      <div>
                        <dt>{t('common.status')}</dt>
                        <dd>{tpl.isDefault ? t('teacher.templates.isDefault') : '—'}</dd>
                      </div>
                    </dl>
                    <div className="teacher__retry">
                      <Button variant="primary" onClick={() => useTemplate(tpl.id)}>
                        {t('teacher.templates.use')}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="teacher__section">
            <h2 className="teacher__section-title">{t('teacher.templates.personalTitle')}</h2>
            {patterns.length === 0 ? (
              <Card>
                <EmptyState title={t('teacher.templates.personalEmpty')} body="">
                  <Button variant="primary" onClick={() => setSaveOpen(true)}>
                    {t('teacher.templates.savePattern')}
                  </Button>
                </EmptyState>
              </Card>
            ) : (
              <div className="teacher-grid">
                {patterns.map((p) => (
                  <Card key={p.id} title={<Bidi>{p.name}</Bidi>}>
                    <p className="teacher-note">
                      <Bidi>
                        {p.sections.map((s) => `${s.questionCount} × ${s.marksPerQuestion}`).join(' + ')}
                        {' = '}
                        {p.targetMarks}
                      </Bidi>
                    </p>
                    <div className="teacher__retry teacher-actions">
                      <Button variant="primary" onClick={() => usePattern(p.id)}>
                        {t('teacher.templates.use')}
                      </Button>
                      <Button variant="ghost" onClick={() => setDeleteTarget(p.id)}>
                        {t('teacher.templates.delete')}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        title={t('teacher.templates.savePattern')}
        footer={(
          <>
            <Button variant="primary" onClick={savePattern}>
              {t('teacher.templates.patternSave')}
            </Button>
            <Button variant="ghost" onClick={() => setSaveOpen(false)}>
              {t('common.cancel')}
            </Button>
          </>
        )}
      >
        <div className="teacher-flow">
          <Input
            id="teacher-pattern-name"
            label={t('teacher.templates.patternNameLabel')}
            value={patternName}
            onChange={(e) => {
              setPatternName(e.target.value)
              if (nameError) setNameError(null)
            }}
            placeholder={t('teacher.templates.patternNamePlaceholder')}
            error={nameError}
            required
          />
          <Select
            label={t('teacher.templates.patternPresetLabel')}
            value={presetId}
            onChange={(e) => setPresetId(e.target.value)}
            options={STUDIO_PRESETS.map((p) => ({
              value: p.id,
              label: `${t(`copy.paper.${p.id === 'board-75' ? 'presetBoard75' : p.id === 'half-book' ? 'presetHalfBook' : 'presetChapterTest'}`)} — ${totalMarks(p.sections)}`,
            }))}
          />
        </div>
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={t('teacher.templates.patternDeleteTitle')}
        footer={(
          <>
            <Button
              variant="primary"
              onClick={() => {
                if (deleteTarget) PlatformService.deletePersonalPattern(teacher.id, deleteTarget)
                setDeleteTarget(null)
                setVersion((v) => v + 1)
              }}
            >
              {t('teacher.templates.delete')}
            </Button>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              {t('common.cancel')}
            </Button>
          </>
        )}
      >
        <p>{t('teacher.templates.patternDeleteBody')}</p>
      </Dialog>
    </div>
  )
}

export default TeacherTemplatesPage
