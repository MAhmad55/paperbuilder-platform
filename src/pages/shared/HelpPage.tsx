import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../shell/PageHeader'
import { Accordion, Banner, Button, Card, EmptyState, Input, Skeleton, Textarea, useToast } from '../../design-system'
import type { AccordionItem } from '../../design-system'
import { Bidi } from '../../utils/bidi'
import { demoModeOf, useSchoolDemo, useSharedUser } from './shared'

type GuideId =
  | 'buildPaper' | 'submitPaper' | 'printPaper'
  | 'inviteTeacher' | 'approvePaper'
  | 'approveSchool' | 'viewAudit' | 'announce'

const GUIDES_BY_ROLE: Record<string, GuideId[]> = {
  teacher: ['buildPaper', 'submitPaper', 'printPaper'],
  'school-admin': ['inviteTeacher', 'approvePaper', 'printPaper'],
  'super-admin': ['approveSchool', 'viewAudit', 'announce'],
}

/** Help (blueprint 4.5.5) — one short guide per role-relevant task, plus a
    contact-support form that answers with a confirmation, not a dead end. */
export function HelpPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [params] = useSearchParams()
  const demoMode = demoModeOf(params.get('demo'))
  const { loading, loadFailed, retry } = useSchoolDemo(demoMode)

  const user = useSharedUser()
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [message, setMessage] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [sentRef, setSentRef] = useState<string | null>(null)

  if (!user) {
    return (
      <div className="shared">
        <Banner variant="error" title={t('shared.help.error.title')}>
          {t('shared.help.error.body')}
        </Banner>
      </div>
    )
  }

  const guides: AccordionItem[] = (GUIDES_BY_ROLE[user.role] ?? []).map((id) => ({
    id,
    question: t(`shared.help.guides.${id}.q`),
    answer: t(`shared.help.guides.${id}.a`),
  }))

  const handleSend = () => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      setFormError(t('shared.help.support.errors.required'))
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError(t('shared.help.support.errors.invalidEmail'))
      return
    }
    setFormError(null)
    setSentRef(`SUP-${Date.now().toString(36).toUpperCase()}`)
    setMessage('')
    toast({ variant: 'success', message: t('shared.help.support.sentTitle') })
  }

  const breadcrumb = [
    { label: t('nav.dashboard'), to: user.role === 'super-admin' ? '/admin' : user.role === 'school-admin' ? '/school' : '/teacher' },
    { label: t('shared.help.title') },
  ]

  return (
    <div className="shared">
      <PageHeader
        breadcrumb={breadcrumb}
        title={t('shared.help.title')}
        lead={t('shared.help.lead')}
      />

      {loading ? (
        <div className="shared__skeleton" aria-label={t('common.loading')} role="status">
          <Skeleton variant="rect" height={120} />
          <Skeleton variant="rect" height={220} />
        </div>
      ) : loadFailed ? (
        <div>
          <Banner variant="error" title={t('shared.help.error.title')}>
            {t('shared.help.error.body')}
          </Banner>
          <div className="shared__retry">
            <Button variant="primary" onClick={retry}>{t('common.retry')}</Button>
          </div>
        </div>
      ) : (
        <div className="shared-help__grid">
          <Card title={t('shared.help.guidesTitle')}>
            <Accordion ariaLabel={t('shared.help.guidesTitle')} items={guides} />
          </Card>

          <Card title={t('shared.help.support.title')}>
            {sentRef ? (
              <EmptyState
                title={t('shared.help.support.sentTitle')}
                body={t('shared.help.support.sentBody')}
              >
                <p className="shared__note">
                  {t('shared.help.support.reference')}: <Bidi>{sentRef}</Bidi>
                </p>
                <Button variant="secondary" onClick={() => setSentRef(null)}>
                  {t('shared.help.support.send')}
                </Button>
              </EmptyState>
            ) : (
              <div className="shared__stack">
                {formError && (
                  <Banner variant="error" title={formError}>
                    {formError}
                  </Banner>
                )}
                <Input
                  label={t('shared.help.support.name')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Input
                  label={t('shared.help.support.email')}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Textarea
                  label={t('shared.help.support.message')}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
                <div>
                  <Button variant="primary" onClick={handleSend}>
                    {t('shared.help.support.send')}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}

export default HelpPage
