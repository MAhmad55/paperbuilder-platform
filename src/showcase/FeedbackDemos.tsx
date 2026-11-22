import { useTranslation } from 'react-i18next'
import { Accordion, Banner, StatusChip, Stepper, Meter, Skeleton, Timeline, EmptyState } from '../design-system'
import '../styles/landing.css'
import { Demo } from './Demo'
import type { ChipStatus } from '../design-system'
import { Button } from '../design-system'
import Bidi from '../utils/bidi'
import { formatDateTime } from '../utils/date'
import type { AppLanguage } from '../i18n'

export function FeedbackDemos() {
  const { t, i18n } = useTranslation()
  const lang = (i18n.language === 'ur' ? 'ur' : 'en') as AppLanguage

  return (
    <>
      <Demo
        id="banner"
        title={t('copy.feedback.titleBanner')}
        states={['default', 'error']}
        render={state => (
          <Banner
            variant={state === 'error' ? 'error' : 'info'}
            title={state === 'error' ? t('copy.feedback.bannerTitleError') : t('copy.feedback.bannerTitleInfo')}
            onClose={undefined}
          >
            {state === 'error' ? t('copy.feedback.bannerBodyError') : t('copy.feedback.bannerBodyInfo')}
          </Banner>
        )}
      />
      <Demo
        id="banner-variants"
        title={t('copy.feedback.titleBannerVariants')}
        states={['default']}
        render={() => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Banner variant="info" title={t('copy.feedback.bannerInfoTitle')} onClose={undefined}>{t('copy.feedback.bannerInfoBody')}</Banner>
            <Banner variant="success" title={t('copy.feedback.bannerSuccessTitle')} onClose={undefined}>{t('copy.feedback.bannerSuccessBody')}</Banner>
            <Banner variant="warning" title={t('copy.feedback.bannerWarningTitle')} onClose={undefined}>
              {t('copy.feedback.chaptersPending_other', { count: 3 })}
            </Banner>
            <Banner variant="error" title={t('copy.feedback.bannerErrorTitle')} onClose={undefined}>{t('copy.feedback.bannerErrorBody')}</Banner>
          </div>
        )}
      />
      <Demo
        id="status-chip"
        title={t('copy.feedback.titleStatusChip')}
        note={t('copy.feedback.statusChipNote')}
        states={['default', 'hover']}
        render={state => (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['draft', 'submitted', 'in-review', 'approved', 'changes-requested', 'printed', 'archived'] as ChipStatus[]).map(s => (
              <StatusChip key={s} status={s} data-force={state === 'hover' ? 'hover' : undefined} />
            ))}
          </div>
        )}
      />
      <Demo
        id="stepper"
        title={t('copy.feedback.titleStepper')}
        note={t('copy.feedback.stepperNote')}
        states={['default']}
        wide
        render={() => (
          <Stepper
            ariaLabel={t('copy.feedback.stepperAria')}
            steps={[
              { id: 'setup', title: t('copy.feedback.stepSetup'), summary: t('copy.feedback.stepSetupMeta'), state: 'done' },
              { id: 'scope', title: t('copy.feedback.stepScope'), summary: t('copy.feedback.stepScopeMeta', { chapters: 4, questions: 41 }), state: 'done' },
              { id: 'blueprint', title: t('copy.feedback.stepBlueprint'), summary: t('copy.paper.presetBoard75'), state: 'current' },
              { id: 'questions', title: t('copy.feedback.stepQuestions'), state: 'blocked' },
              { id: 'review', title: t('copy.feedback.stepReview'), state: 'pending' },
              { id: 'finish', title: t('copy.feedback.stepFinish'), state: 'pending' },
            ]}
          />
        )}
      />
      <Demo
        id="meter"
        title={t('copy.feedback.titleMeter')}
        note={t('copy.feedback.meterNote')}
        states={['default']}
        render={() => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Meter target={75} current={0} label={t('copy.feedback.meterDraft')} />
            <Meter target={75} current={35} label={t('copy.feedback.meterUnder')} />
            <Meter target={75} current={64} label={t('copy.feedback.meterNear')} />
            <Meter target={75} current={75} label={t('copy.feedback.meterMet')} />
            <Meter target={75} current={90} label={t('copy.feedback.meterOver')} />
          </div>
        )}
      />
      <Demo
        id="skeleton"
        title={t('copy.feedback.titleSkeleton')}
        states={['default']}
        render={() => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Skeleton variant="circle" height={44} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Skeleton width="60%" count={1} />
                <Skeleton width="40%" />
              </div>
            </div>
            <Skeleton height={16} count={3} />
            <Skeleton variant="rect" height={90} />
          </div>
        )}
      />
      <Demo
        id="timeline"
        title={t('copy.feedback.titleTimeline')}
        states={['default']}
        render={() => (
          <Timeline
            ariaLabel={t('copy.feedback.timelineAria')}
            items={[
              { id: '1', title: t('copy.feedback.timelineApproved'), meta: formatDateTime('2026-11-08T14:20:00', lang), description: t('copy.feedback.timelineApprovedDescription') },
              { id: '2', title: t('copy.feedback.timelineSubmitted'), meta: formatDateTime('2026-11-05T10:42:00', lang) },
              { id: '3', title: t('copy.feedback.timelineChanges'), meta: formatDateTime('2026-11-04T09:15:00', lang), tone: 'muted' },
              { id: '4', title: t('copy.feedback.timelineCreated'), meta: formatDateTime('2026-11-02T08:10:00', lang), tone: 'muted' },
            ]}
          />
        )}
      />
      <Demo
        id="empty-state"
        title={t('copy.feedback.titleEmptyState')}
        states={['default']}
        render={() => (
          <EmptyState
            title={t('copy.feedback.emptyTitle')}
            body={t('copy.feedback.emptyBody')}
          >
            <Button variant="primary" size="md">{t('copy.feedback.emptyBtn')}</Button>
          </EmptyState>
        )}
      />
      <Demo
        id="accordion"
        title={t('landing.faq.title')}
        states={['default']}
        render={() => (
          <Accordion
            ariaLabel={t('landing.faq.title')}
            items={[1, 2].map(n => ({
              id: `demo-faq-${n}`,
              question: t(`landing.faq.q${n}`),
              answer: t(`landing.faq.a${n}`),
            }))}
          />
        )}
      />
    </>
  )
}

export default FeedbackDemos
